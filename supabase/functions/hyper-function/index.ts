// Metal Stack Ledger: price updater (Supabase Edge Function)
// No imports: it talks to your database through Supabase's built-in REST API.
//
// Runs on a schedule (set up in 3_schedule.sql). Each run:
//   1. asks MetalpriceAPI for gold, silver, platinum and palladium
//   2. rejects anything that looks wrong (missing, stale, or a >10% jump)
//   3. overwrites the current spot prices (the app shows these live)
//   4. saves the first good price of each hour to the price history
//
// Secrets it needs (Dashboard -> Edge Functions -> Secrets):
//   METALS_API_KEY  your MetalpriceAPI key
//   CRON_SECRET     any long random string; the scheduler sends it so strangers can't trigger this
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to Edge Functions automatically.

type Metal = "XAU" | "XAG" | "XPT" | "XPD";
type Quote = { metal: Metal; price: number; quotedAt: Date };

const METALS: Metal[] = ["XAU", "XAG", "XPT", "XPD"];
const MAX_JUMP = 0.10;   // reject a price more than 10% away from the last one
// Reject quotes older than this. 20 minutes suits plans that update every 10 minutes or faster.
// On the free plan (daily updates), set the secret MAX_QUOTE_AGE_MINUTES to 1500.
const MAX_AGE_MS = Number(Deno.env.get("MAX_QUOTE_AGE_MINUTES") ?? 20) * 60 * 1000;
const SOURCE = "MetalpriceAPI";

// ---------------------------------------------------------------------------
// The only provider-specific part, written for MetalpriceAPI's /v1/latest endpoint.
// Its response looks like:
//   {"success":true,"base":"USD","timestamp":1792729860,
//    "rates":{"USDXAU":4006.63,"USDXAG":53.67,"USDXPT":1566.76,"USDXPD":1051.29,
//             "XAU":0.0002495862, ...}}
// "USDXAU" is US dollars per troy ounce of gold; "XAU" is ounces per dollar.
// The timestamp is in seconds.
// ---------------------------------------------------------------------------
async function fetchQuotes(apiKey: string): Promise<Quote[]> {
  const url = new URL("https://api.metalpriceapi.com/v1/latest");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("base", "USD");
  url.searchParams.set("currencies", METALS.join(","));

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Price API returned ${res.status}`);
  const body = await res.json();
  if (body?.success !== true) throw new Error(`Price API error: ${JSON.stringify(body?.error ?? body)}`);

  const quotedAt = new Date(Number(body.timestamp) * 1000);
  if (isNaN(quotedAt.getTime())) throw new Error("Price API response had no timestamp");

  return METALS.flatMap((metal) => {
    let price = Number(body.rates?.[`USD${metal}`]);
    if (!(price > 0)) {                       // fall back to inverting the per-dollar rate
      const perDollar = Number(body.rates?.[metal]);
      price = perDollar > 0 ? 1 / perDollar : NaN;
    }
    return Number.isFinite(price) && price > 0 ? [{ metal, price: Math.round(price * 100) / 100, quotedAt }] : [];
  });
}

// Small helper for the database's REST API, using the service key (bypasses row level security)
function rest(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("Not allowed", { status: 401 });
  }

  const apiKey = (Deno.env.get("METALS_API_KEY") ?? "").trim();
  if (!apiKey) {
    // Names only (never values), to help spot a misspelled secret
    const similar = Object.keys(Deno.env.toObject()).filter((k) => /METAL|API|KEY/i.test(k) && !k.startsWith("SUPABASE"));
    return Response.json({
      ok: false,
      error: "The METALS_API_KEY secret is missing or empty for this function.",
      similarSecretNames: similar,
    }, { status: 500 });
  }

  let quotes: Quote[];
  try {
    quotes = await fetchQuotes(apiKey);
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 502 });
  }

  // Compare against the last stored prices before accepting anything
  const readRes = await rest("spot_prices?select=metal,price");
  if (!readRes.ok) return Response.json({ ok: false, error: `Reading prices: ${await readRes.text()}` }, { status: 500 });
  const current: { metal: string; price: number }[] = await readRes.json();
  const last = new Map(current.map((r) => [r.metal, Number(r.price)]));

  const now = Date.now();
  const accepted: Quote[] = [];
  const rejected: string[] = [];
  for (const q of quotes) {
    const prev = last.get(q.metal);
    if (now - q.quotedAt.getTime() > MAX_AGE_MS) { rejected.push(`${q.metal}: stale quote from ${q.quotedAt.toISOString()}`); continue; }
    if (prev && Math.abs(q.price / prev - 1) > MAX_JUMP) { rejected.push(`${q.metal}: jump from ${prev} to ${q.price}`); continue; }
    accepted.push(q);
  }
  if (!accepted.length) return Response.json({ ok: false, rejected });

  // 1. Current prices (insert or overwrite each metal's row)
  const spotRes = await rest("spot_prices?on_conflict=metal", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(accepted.map((q) => ({
      metal: q.metal, price: q.price, quoted_at: q.quotedAt.toISOString(),
      source: SOURCE, updated_at: new Date().toISOString(),
    }))),
  });
  if (!spotRes.ok) return Response.json({ ok: false, error: `Saving prices: ${await spotRes.text()}` }, { status: 500 });

  // 2. History: one row per metal per hour; later quotes in the same hour are ignored
  const hour = (d: Date) => { const h = new Date(d); h.setUTCMinutes(0, 0, 0); return h.toISOString(); };
  const histRes = await rest("price_history?on_conflict=metal,bucket", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(accepted.map((q) => ({
      metal: q.metal, price: q.price, bucket: hour(q.quotedAt), granularity: "hour", source: SOURCE,
    }))),
  });
  if (!histRes.ok) return Response.json({ ok: false, error: `Saving history: ${await histRes.text()}` }, { status: 500 });

  return Response.json({ ok: true, saved: accepted.map((q) => q.metal), rejected });
});
