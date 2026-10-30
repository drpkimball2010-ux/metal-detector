"use client";

import { useEffect, useMemo, useState } from "react";
import { spotOnDay, type PurchaseStore } from "@/lib/store";
import {
  GRADES, JUNK, METALS, METAL_KEYS, PRESETS, UNITS, faceStr, fineOz, fmtDay, fmtOz, todayLocal, usd, usdSpot,
  type Metal, type Purchase, type Unit,
} from "@/lib/metals";
import type { Prices } from "./Dashboard";

type DaySpot = { price: number; at: string } | null | "loading";

export default function AddPurchase({ prices, store, onAdded }: { prices: Prices; store: PurchaseStore; onAdded: (p: Purchase) => void }) {
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
  const [junkBy, setJunkBy] = useState<"face" | "coins">("face");
  const [junkAmt, setJunkAmt] = useState("");

  const presets = PRESETS.filter((p) => p.metals === "*" || p.metals.includes(metal));
  const junkCoins = JUNK.filter((j) => j.metal === metal);
  const junk = JUNK.find((j) => j.id === preset) ?? null;

  // Junk coins: face value or coin count -> number of coins (or $1 units for mixed)
  const junkN = parseFloat(junkAmt) || 0;
  const by = junk?.mixed ? "face" : junkBy;
  const junkExact = junk ? (by === "face" ? junkN / junk.face : junkN) : 0;
  const junkUnits = junk ? (junk.mixed ? junkN : Math.round(junkExact)) : 0; // whole coins
  const junkFace = junk ? (junk.mixed ? junkN : junkUnits * junk.face) : 0;
  const junkOff = !!junk && !junk.mixed && by === "face" && junkN > 0 && Math.abs(junkExact - junkUnits) > 1e-6;

  const purity = junk ? junk.purity : grade === "custom" ? parseFloat(customPurity) || 0 : GRADES[metal][Number(grade)]?.[1] ?? 0;
  const gradeLabel = junk ? GRADES[metal].find((g) => Math.abs(g[1] - junk.purity) < 1e-6)?.[0] ?? null
    : grade === "custom" ? null : GRADES[metal][Number(grade)]?.[0] ?? null;
  const oz = junk ? fineOz({ qty: junkUnits, weight: junk.weight, unit: junk.unit, purity: junk.purity })
    : fineOz({ qty: parseFloat(qty) || 0, weight: parseFloat(weight) || 0, unit, purity });
  const spotNow = prices[metal]?.price ?? 0;

  function applyPreset(id: string, m: Metal = metal) {
    setPreset(id);
    const j = JUNK.find((x) => x.id === id);
    if (j) { setDescription(j.label); if (j.mixed) setJunkBy("face"); return; }
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
    if (junk && !(junkUnits > 0)) return setMsg({ text: by === "face" ? "Enter the face value, like 2.40." : "Enter how many coins.", ok: false });
    if (!junk && (!(parseFloat(qty) > 0) || !(parseFloat(weight) > 0))) return setMsg({ text: "Enter a quantity and a weight.", ok: false });
    if (!(purity > 0 && purity <= 1)) return setMsg({ text: "Purity must be a decimal between 0 and 1, like 0.925.", ok: false });
    if (!boughtNow && !day) return setMsg({ text: "Enter the date you bought it, or check Bought just now.", ok: false });
    if (!boughtNow && day > todayLocal()) return setMsg({ text: "That date is in the future.", ok: false });
    if (paid.trim() !== "" && !(parseFloat(paid) >= 0)) return setMsg({ text: "Total paid must be a dollar amount.", ok: false });

    setBusy(true);
    let row: Purchase;
    try {
      const junkDesc = junk && `${description.trim() || junk.label}, ${junk.mixed ? "" : `${junkUnits} coins, `}${faceStr(junkFace)} face`;
      row = await store.add({
        metal, description: junk ? junkDesc : description.trim() || null,
        qty: junk ? junkUnits : parseFloat(qty), weight: junk ? junk.weight : parseFloat(weight), unit: junk ? junk.unit : unit,
        purity, grade: gradeLabel,
        bought_now: boughtNow, bought_on: boughtNow ? null : day,
        paid: paid.trim() === "" ? null : parseFloat(paid),
      });
    } catch {
      setBusy(false);
      return setMsg({ text: "Couldn't save that purchase. Check your connection and try again.", ok: false });
    }
    setBusy(false);
    onAdded(row);
    setPaid(""); if (junk) setJunkAmt("");
    setMsg({ text: "Added.", ok: true });
  }

  const blankPaid = paid.trim() === "";

  return (
    <section>
      <div className="sechead">
        <h2>Log a purchase</h2>
        <span className="small muted">🔒 Only you can see what you log here</span>
      </div>
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
              {junkCoins.length > 0 && (
                <optgroup label={metal === "XCU" ? "Copper coins (by face value or count)" : "Junk silver coins (by face value or count)"}>
                  {junkCoins.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div className="field wide">
            <label htmlFor="f-desc">Description</label>
            <input id="f-desc" placeholder="e.g. 2024 Silver Eagle, 10 oz bar" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {junk ? (
            <div className="field wide junk-box">
              {!junk.mixed && (
                <div className="seg" role="radiogroup" aria-label="Count by">
                  <button type="button" role="radio" aria-checked={by === "face"} onClick={() => setJunkBy("face")}>Face value ($)</button>
                  <button type="button" role="radio" aria-checked={by === "coins"} onClick={() => setJunkBy("coins")}>Number of coins</button>
                </div>
              )}
              <label htmlFor="f-junk">{by === "face" ? "Face value ($)" : "How many coins"}</label>
              <input id="f-junk" className="num" type="number" min="0" step={by === "face" ? "0.01" : "1"} inputMode="decimal"
                placeholder={by === "face" ? "e.g. 2.40" : "e.g. 48"} value={junkAmt} onChange={(e) => setJunkAmt(e.target.value)} autoFocus />
              <span className="small muted">
                {junk.mixed
                  ? <>Each $1 of face holds about {fmtOz(fineOz({ qty: 1, weight: junk.weight, unit: junk.unit, purity: junk.purity }))} oz of pure silver.</>
                  : <>Each coin is {faceStr(junk.face)} face, {junk.weight} {junk.unit === "g" ? "g" : "oz"}, {Math.round(junk.purity * 100)}% {METALS[metal].name.toLowerCase()}.</>}
                {junkUnits > 0 && !junk.mixed && <> <strong className="num">{junkUnits} coins = {faceStr(junkFace)} face.</strong></>}
                {junkOff && <> {faceStr(junkN)} isn&apos;t an even number of these coins, so it&apos;s rounded to {faceStr(junkFace)}.</>}
              </span>
            </div>
          ) : (
            <>
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
            </>
          )}
          <div className="field">
            <label htmlFor="f-paid">Total paid ($)</label>
            <input id="f-paid" className="num" type="number" min="0" step="any" inputMode="decimal"
              placeholder="Blank = spot price"
              value={paid} onChange={(e) => setPaid(e.target.value)} aria-describedby="paid-hint" />
            <span className="small muted" id="paid-hint">
              {boughtNow ? "Leave blank to log it at today's spot price." : "Leave blank to log it at that day's spot price."}
            </span>
          </div>
          <div className="field">
            <label htmlFor="f-date">Date bought</label>
            <input id="f-date" type="date" max={todayLocal()} disabled={boughtNow} value={day} onChange={(e) => setDay(e.target.value)} />
            <label className="check" htmlFor="f-now">
              <input id="f-now" type="checkbox" checked={boughtNow}
                onChange={(e) => setBoughtNow(e.target.checked)} />
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
