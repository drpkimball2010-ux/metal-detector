"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  GRADES, METALS, METAL_KEYS, PRESETS, UNITS, fineOz, fmtDay, fmtOz, todayLocal, usd, usdSpot,
  type Metal, type Purchase, type Unit,
} from "@/lib/metals";
import type { Prices } from "./Dashboard";

type DaySpot = { price: number; at: string } | null | "loading";

// Nearest recorded price within 72 hours of midday on a date (same rule the database uses)
async function spotOnDay(metal: Metal, day: string): Promise<{ price: number; at: string } | null> {
  const target = new Date(day + "T12:00");
  const lo = new Date(target.getTime() - 72 * 3600e3).toISOString();
  const hi = new Date(target.getTime() + 72 * 3600e3).toISOString();
  const t = target.toISOString();
  const [before, after] = await Promise.all([
    supabase.from("price_history").select("price,bucket").eq("metal", metal).lte("bucket", t).gte("bucket", lo).order("bucket", { ascending: false }).limit(1),
    supabase.from("price_history").select("price,bucket").eq("metal", metal).gte("bucket", t).lte("bucket", hi).order("bucket", { ascending: true }).limit(1),
  ]);
  const cands = [...(before.data ?? []), ...(after.data ?? [])];
  if (!cands.length) return null;
  cands.sort((a, b) => Math.abs(Date.parse(a.bucket) - target.getTime()) - Math.abs(Date.parse(b.bucket) - target.getTime()));
  return { price: Number(cands[0].price), at: cands[0].bucket };
}

export default function AddPurchase({ prices, onAdded }: { prices: Prices; onAdded: (p: Purchase) => void }) {
  const [metal, setMetal] = useState<Metal>("XAG");
  const [preset, setPreset] = useState("bar");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [weight, setWeight] = useState("1");
  const [unit, setUnit] = useState<Unit>("ozt");
  const [grade, setGrade] = useState("0");          // index into GRADES[metal], or "custom"
  const [customPurity, setCustomPurity] = useState("");
  const [boughtNow, setBoughtNow] = useState(true);
  const [day, setDay] = useState(todayLocal());
  const [paid, setPaid] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [daySpot, setDaySpot] = useState<DaySpot>(null);

  const presets = PRESETS.filter((p) => p.metals === "*" || p.metals.includes(metal));
  const purity = grade === "custom" ? parseFloat(customPurity) || 0 : GRADES[metal][Number(grade)]?.[1] ?? 0;
  const gradeLabel = grade === "custom" ? null : GRADES[metal][Number(grade)]?.[0] ?? null;
  const oz = fineOz({ qty: parseFloat(qty) || 0, weight: parseFloat(weight) || 0, unit, purity });
  const spotNow = prices[metal]?.price ?? 0;

  function applyPreset(id: string, m: Metal = metal) {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (!p || p.id === "custom") return;
    if (p.weight != null) setWeight(String(p.weight));
    if (p.unit) setUnit(p.unit);
    if (p.purity == null) setGrade("0");
    else {
      const i = GRADES[m].findIndex((g) => Math.abs(g[1] - p.purity!) < 1e-6);
      if (i >= 0) setGrade(String(i)); else { setGrade("custom"); setCustomPurity(String(p.purity)); }
    }
    if (p.label) setDescription(p.label);
  }

  function changeMetal(m: Metal) {
    setMetal(m); setGrade("0"); applyPreset("bar", m); setDescription("");
  }

  // Look up the spot price for a past date
  useEffect(() => {
    if (boughtNow || !day) { setDaySpot(null); return; }
    let cancelled = false;
    setDaySpot("loading");
    spotOnDay(metal, day).then((r) => { if (!cancelled) setDaySpot(r); });
    return () => { cancelled = true; };
  }, [boughtNow, day, metal]);

  const thenPrice = boughtNow ? spotNow : daySpot && daySpot !== "loading" ? daySpot.price : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!(parseFloat(qty) > 0) || !(parseFloat(weight) > 0)) return setMsg({ text: "Enter a quantity and a weight.", ok: false });
    if (!(purity > 0 && purity <= 1)) return setMsg({ text: "Purity must be a decimal between 0 and 1, like 0.925.", ok: false });
    if (!boughtNow && !day) return setMsg({ text: "Enter the date you bought it, or check Bought just now.", ok: false });
    if (!boughtNow && day > todayLocal()) return setMsg({ text: "That date is in the future.", ok: false });
    if (!boughtNow && paid.trim() !== "" && !(parseFloat(paid) >= 0)) return setMsg({ text: "Total paid must be a dollar amount.", ok: false });

    setBusy(true);
    const { data, error } = await supabase.from("purchases").insert({
      metal, description: description.trim() || null,
      qty: parseFloat(qty), weight: parseFloat(weight), unit, purity, grade: gradeLabel,
      bought_now: boughtNow, bought_on: boughtNow ? null : day,
      paid: boughtNow || paid.trim() === "" ? null : parseFloat(paid),
    }).select().single();
    setBusy(false);

    if (error) return setMsg({ text: "Couldn't save that purchase. Check your connection and try again.", ok: false });
    onAdded(data as Purchase);
    setPaid("");
    setMsg({ text: "Added.", ok: true });
  }

  const blankPaid = boughtNow || paid.trim() === "";

  return (
    <section>
      <h2>Log a purchase</h2>
      <form className="card" onSubmit={submit} autoComplete="off">
        <div className="grid">
          <div className="field">
            <label htmlFor="f-metal">Metal</label>
            <select id="f-metal" value={metal} onChange={(e) => changeMetal(e.target.value as Metal)}>
              {METAL_KEYS.map((k) => <option key={k} value={k}>{METALS[k].name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-preset">Common product</label>
            <select id="f-preset" value={preset} onChange={(e) => applyPreset(e.target.value)}>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field wide">
            <label htmlFor="f-desc">Description</label>
            <input id="f-desc" placeholder="e.g. 2024 Silver Eagle, 10 oz bar" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-qty">Quantity</label>
            <input id="f-qty" className="num" type="number" min="0" step="any" inputMode="decimal" value={qty}
              onChange={(e) => { setQty(e.target.value); }} />
          </div>
          <div className="field">
            <label htmlFor="f-weight">Weight each</label>
            <input id="f-weight" className="num" type="number" min="0" step="any" inputMode="decimal" value={weight}
              onChange={(e) => { setWeight(e.target.value); setPreset("custom"); }} />
          </div>
          <div className="field">
            <label htmlFor="f-unit">Unit</label>
            <select id="f-unit" value={unit} onChange={(e) => { setUnit(e.target.value as Unit); setPreset("custom"); }}>
              {(Object.keys(UNITS) as Unit[]).map((u) => <option key={u} value={u}>{UNITS[u].label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-grade">Purity</label>
            <select id="f-grade" value={grade} onChange={(e) => { setGrade(e.target.value); setPreset("custom"); }}>
              {GRADES[metal].map(([name], i) => <option key={name} value={String(i)}>{name}</option>)}
              <option value="custom">Enter a number…</option>
            </select>
            {grade === "custom" && (
              <input className="num" type="number" min="0" max="1" step="any" inputMode="decimal" placeholder="e.g. 0.925"
                aria-label="Purity as a decimal" value={customPurity} onChange={(e) => setCustomPurity(e.target.value)} autoFocus />
            )}
          </div>
          <div className="field">
            <label htmlFor="f-paid">Total paid ($)</label>
            <input id="f-paid" className="num" type="number" min="0" step="any" inputMode="decimal"
              disabled={boughtNow} placeholder={boughtNow ? "Logged at spot" : "Blank = spot price"}
              value={boughtNow ? "" : paid} onChange={(e) => setPaid(e.target.value)} aria-describedby="paid-hint" />
            <span className="small muted" id="paid-hint">
              {boughtNow ? "To enter what you paid, uncheck Bought just now." : "Leave blank to log it at that day's spot price."}
            </span>
          </div>
          <div className="field">
            <label htmlFor="f-date">Date bought</label>
            <input id="f-date" type="date" max={todayLocal()} disabled={boughtNow} value={day} onChange={(e) => setDay(e.target.value)} />
            <label className="check" htmlFor="f-now">
              <input id="f-now" type="checkbox" checked={boughtNow}
                onChange={(e) => { setBoughtNow(e.target.checked); if (e.target.checked) setPaid(""); }} />
              Bought just now
            </label>
          </div>
        </div>

        <p className="preview" style={{ margin: 0 }}>
          That&apos;s <strong className="num">{fmtOz(oz)}</strong> fine troy oz of {METALS[metal].name.toLowerCase()},
          worth <strong className="num">{usd(oz * spotNow)}</strong> today.{" "}
          {boughtNow && <>Spot price logged with it: <strong className="num">{usdSpot(spotNow)}</strong>. </>}
          {!boughtNow && daySpot === "loading" && <>Looking up the spot price for that day… </>}
          {!boughtNow && daySpot && daySpot !== "loading" && (
            <>Spot on {fmtDay(day)}: <strong className="num">{usdSpot(daySpot.price)}</strong>. </>
          )}
          {!boughtNow && daySpot === null && day && <>No price is recorded near that date, so the spot when bought will show as pending. </>}
          {blankPaid && thenPrice != null && <>What you paid will be logged at spot: <strong className="num">{usd(oz * thenPrice)}</strong>.</>}
        </p>

        <div className="actions">
          <button className="primary" type="submit" disabled={busy}>{busy ? "Adding…" : "Add purchase"}</button>
          {msg && <span className={`msg ${msg.ok ? "ok" : "bad"}`}>{msg.text}</span>}
        </div>
      </form>
    </section>
  );
}
