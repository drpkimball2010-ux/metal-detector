"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { METALS, METAL_KEYS, fineOz, fmtOz, fmtWhen, usd, usdSpot, type Metal, type Purchase, type SpotRow } from "@/lib/metals";
import AddPurchase from "./AddPurchase";
import PurchaseList from "./PurchaseList";
import WhereToBuy from "./WhereToBuy";
import ImportExport from "./ImportExport";
import AccountSection from "./AccountSection";
import Footer from "./Footer";
import { SITE_NAME } from "@/lib/site";
import { accountStore, demoStore } from "@/lib/store";

export type Prices = Partial<Record<Metal, SpotRow>>;

// session: a signed-in user, saved to their account. demo: no account, saved in this browser only.
export default function Dashboard({ session, demo = false }: { session?: Session | null; demo?: boolean }) {
  const [prices, setPrices] = useState<Prices>({});
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pricesRef = useRef<Prices>({});
  pricesRef.current = prices;

  const store = useMemo(() => demo
    ? demoStore((m) => { const r = pricesRef.current[m]; return r ? { price: r.price, at: r.quoted_at } : null; })
    : accountStore, [demo]);

  const loadPrices = useCallback(async () => {
    const { data, error } = await supabase.from("spot_prices").select("*");
    if (error) { setLoadError("Spot prices couldn't load. Check your connection and reload."); return; }
    const next: Prices = {};
    for (const r of data ?? []) next[r.metal as Metal] = { ...r, price: Number(r.price) } as SpotRow;
    pricesRef.current = next;
    setPrices(next);
  }, []);

  const loadPurchases = useCallback(async () => {
    try { setPurchases(await store.list()); setLoaded(true); }
    catch { setLoadError("Your purchases couldn't load. Check your connection and reload."); }
  }, [store]);

  async function resetDemo() {
    if (!demo) return;
    setLoaded(false);
    setPurchases(await (store as ReturnType<typeof demoStore>).reset());
    setLoaded(true);
  }

  useEffect(() => {
    // Prices first, so the demo's starter stack can use today's spot
    loadPrices().then(loadPurchases);
    // Live: new prices arrive the moment the updater saves them
    const channel = supabase
      .channel("spot-prices")
      .on("postgres_changes", { event: "*", schema: "public", table: "spot_prices" }, (payload) => {
        const r = payload.new as SpotRow;
        if (r?.metal) setPrices((p) => ({ ...p, [r.metal]: { ...r, price: Number(r.price) } }));
      })
      .subscribe();
    // Backup in case the live connection drops
    const poll = setInterval(loadPrices, 120_000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [loadPrices, loadPurchases]);

  const summary = useMemo(() => {
    const by = Object.fromEntries(METAL_KEYS.map((k) => [k, { oz: 0, val: 0, paid: 0, paidOz: 0 }])) as
      Record<Metal, { oz: number; val: number; paid: number; paidOz: number }>;
    let total = 0, cost = 0;
    for (const p of purchases) {
      const oz = fineOz(p), v = oz * (prices[p.metal]?.price ?? 0);
      by[p.metal].oz += oz; by[p.metal].val += v; total += v; cost += Number(p.paid ?? 0);
      // Average cost only counts purchases that have a paid amount
      if (p.paid != null) { by[p.metal].paid += Number(p.paid); by[p.metal].paidOz += oz; }
    }
    return { by, total, cost };
  }, [purchases, prices]);

  const newest = Object.values(prices).reduce<string | null>((a, r) => (!a || (r && r.updated_at > a) ? r?.updated_at ?? a : a), null);
  const stale = newest ? Date.now() - Date.parse(newest) > 30 * 60 * 1000 : true;
  // The updater runs on every 10-minute mark (:00, :10, :20 ...)
  const nextUpdate = newest ? new Date(Math.floor(Date.parse(newest) / 600_000) * 600_000 + 600_000) : null;
  const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const gain = summary.total - summary.cost;

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /><h1>{SITE_NAME}</h1></div>
        {demo ? (
          <div className="actions">
            <Link className="button-link" href="/">Exit demo</Link>
            <Link className="button-link primary" href="/#get-started">Create free account</Link>
          </div>
        ) : (
          <div className="actions">
            <span className="small muted">{session?.user.email}</span>
            <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        )}
      </div>

      {demo && (
        <div className="demo-note" role="note">
          <div>
            <strong>You&apos;re trying the demo.</strong>{" "}
            <span className="muted">This is a sample stack priced at today&apos;s real spot prices. Add or remove anything; it&apos;s kept in this browser only and isn&apos;t saved to an account.</span>
          </div>
          <div className="actions">
            <button type="button" onClick={resetDemo}>Reset demo</button>
            <Link className="button-link primary" href="/#get-started">Save my own stack</Link>
          </div>
        </div>
      )}

      {loadError && <div className="notice" role="alert">{loadError}</div>}

      <header className="hero">
        <div className="eyebrow">Melt value at spot</div>
        <div className="total num">{usd(summary.total)}</div>
        <div className="sub">
          <span>Paid <span className="num">{usd(summary.cost)}</span></span>
          {summary.cost > 0 && (
            <span className={`num ${gain >= 0 ? "up" : "down"}`}>
              {gain >= 0 ? "Up " : "Down "}{usd(Math.abs(gain))} ({gain >= 0 ? "+" : ""}{((gain / summary.cost) * 100).toFixed(1)}%)
            </span>
          )}
        </div>
      </header>

      <ImportExport purchases={purchases} prices={prices} store={store}
        onImported={(rows) => setPurchases((ps) => [...rows, ...ps])} />

      <WhereToBuy variant="dashboard" />

      <div className="bar" aria-hidden="true">
        {summary.total > 0 && METAL_KEYS.map((k) => summary.by[k].val > 0 && (
          <span key={k} style={{ width: `${(summary.by[k].val / summary.total) * 100}%`, background: METALS[k].color }} />
        ))}
      </div>

      <div className="tiles">
        {METAL_KEYS.map((k) => (
          <div className="tile" key={k}>
            <div className="name"><span className="chip" style={{ background: METALS[k].color }} />{METALS[k].name}</div>
            <div className="val num">{usd(summary.by[k].val)}</div>
            <div className="small muted num">{fmtOz(summary.by[k].oz)} pure oz</div>
          </div>
        ))}
      </div>

      <PureMetal by={summary.by} />

      <section>
        <div className="sechead">
          <h2>Spot prices</h2>
          <span className={`live ${stale ? "stale" : ""}`}>
            <span className="dot" aria-hidden="true" />
            {newest ? `Updated ${fmtTime(newest)}` : "Loading prices…"}
          </span>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Spot prices refresh automatically every 10 minutes
          {nextUpdate && !stale ? <>; next update around {fmtTime(nextUpdate)}</> : null}. Prices are in US dollars per troy ounce.
        </p>
        <div className="tiles spot">
          {METAL_KEYS.map((k) => (
            <div className="tile" key={k}>
              <div className="name"><span className="chip" style={{ background: METALS[k].color }} />{METALS[k].name}</div>
              <div className="val num">{prices[k] ? usdSpot(prices[k]!.price) : "—"}</div>
              <div className="small muted">per troy oz</div>
            </div>
          ))}
        </div>
      </section>

      <PurchaseList purchases={purchases} prices={prices} loaded={loaded} store={store}
        onDeleted={(id) => setPurchases((ps) => ps.filter((p) => p.id !== id))} />

      <AddPurchase prices={prices} store={store} onAdded={(p) => setPurchases((ps) => [p, ...ps])} />

      <p className="muted small" style={{ margin: 0 }}>
        Melt value is fine metal weight × spot price. Spot prices refresh every 10 minutes and can&apos;t be edited.
        &quot;Spot when bought&quot; uses the price recorded for that day, back to January 1, 2026 for gold, silver, platinum and palladium; rhodium and copper start from the day they were added. Dealers usually buy back
        somewhat below spot, and graded or collectible coins can sell above it.
      </p>

      {!demo && session && <AccountSection session={session} />}

      <Footer />
    </main>
  );
}

// How much pure (fine) metal the user owns, per metal
const G_PER_OZT = 31.1034768;
function PureMetal({ by }: { by: Record<Metal, { oz: number; val: number; paid: number; paidOz: number }> }) {
  const held = METAL_KEYS.filter((k) => by[k].oz > 0);
  return (
    <section>
      <div className="sechead">
        <h2>Pure metal</h2>
        <span className="small muted">Fine metal only, after purity</span>
      </div>
      <div className="tbl">
        <table className="pure">
          <thead>
            <tr>
              <th>Metal</th><th className="r">Pure troy oz</th><th className="r">Grams</th>
              <th className="r">Value now</th><th className="r">Avg cost per oz</th>
            </tr>
          </thead>
          <tbody>
            {held.length === 0 && (
              <tr><td colSpan={5} className="empty">Your pure ounces for each metal will show here once you log a purchase.</td></tr>
            )}
            {held.map((k) => {
              const m = by[k];
              const avg = m.paidOz > 0 ? m.paid / m.paidOz : null;
              return (
                <tr key={k}>
                  <td><span className="name" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                    <span className="chip" style={{ background: METALS[k].color }} />{METALS[k].name}</span></td>
                  <td className="r num"><strong>{fmtOz(m.oz)}</strong>
                    {k === "XCU" && <div className="small muted">{(m.oz * G_PER_OZT / 453.59237).toFixed(2)} lb</div>}</td>
                  <td className="r num">{(m.oz * G_PER_OZT).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                  <td className="r num">{usd(m.val)}</td>
                  <td className="r num">{avg != null ? usdSpot(avg) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
