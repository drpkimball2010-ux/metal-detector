"use client";

import { useState } from "react";
import type { PurchaseStore } from "@/lib/store";
import { GRADES, type Unit } from "@/lib/metals";
import { METALS, UNITS, fineOz, fmtDay, fmtOz, fmtWhen, usd, usdSpot, type Purchase } from "@/lib/metals";
import type { Prices } from "./Dashboard";

type RowProps = { p: Purchase; prices: Prices; store: PurchaseStore; onDeleted: (id: string) => void; onUpdated: (p: Purchase) => void };

export default function PurchaseList({ purchases, prices, loaded, store, onDeleted, onUpdated }: {
  purchases: Purchase[]; prices: Prices; loaded: boolean; store: PurchaseStore; onDeleted: (id: string) => void; onUpdated: (p: Purchase) => void;
}) {
  const sorted = [...purchases].sort((a, b) =>
    (b.bought_on ?? b.created_at.slice(0, 10)).localeCompare(a.bought_on ?? a.created_at.slice(0, 10)) ||
    b.created_at.localeCompare(a.created_at));

  return (
    <section>
      <div className="sechead">
        <h2>Purchases</h2>
        {purchases.length > 0 && <span className="muted num">{purchases.length} {purchases.length === 1 ? "entry" : "entries"}</span>}
      </div>
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Item</th><th className="r">Qty</th><th className="r">Fine oz</th>
              <th className="r">Spot when bought</th><th className="r">Paid</th><th className="r">Worth now</th><th />
            </tr>
          </thead>
          <tbody>
            {!loaded && <tr><td colSpan={7} className="empty">Loading your purchases…</td></tr>}
            {loaded && sorted.length === 0 && (
              <tr><td colSpan={7} className="empty">No purchases yet. Log your first one below and your total updates right away.</td></tr>
            )}
            {sorted.map((p) => <Row key={p.id} p={p} prices={prices} store={store} onDeleted={onDeleted} onUpdated={onUpdated} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ p, prices, store, onDeleted, onUpdated }: RowProps) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const oz = fineOz(p);
  const spotNow = prices[p.metal]?.price ?? 0;
  const worth = oz * spotNow;
  const spotThen = p.spot_then != null ? Number(p.spot_then) : null;
  const paid = p.paid != null ? Number(p.paid) : null;
  const when = p.bought_on ? fmtDay(p.bought_on) : fmtDay(p.created_at.slice(0, 10));

  async function remove() {
    setBusy(true);
    try { await store.remove(p.id); setBusy(false); onDeleted(p.id); }
    catch { setBusy(false); setConfirming(false); }
  }

  return (
    <>
    <tr className={editing ? "editing" : undefined}>
      <td>
        <div className="item-name">{p.description || METALS[p.metal].name}</div>
        <div className="muted small">
          {METALS[p.metal].name} · {Number(p.weight)} {UNITS[p.unit].short} · {p.grade || Number(p.purity)} · {when}
        </div>
      </td>
      <td className="r num">{Number(p.qty)}</td>
      <td className="r num">{fmtOz(oz)}</td>
      <td className="r num">
        {spotThen != null ? (
          <>
            <div>{usdSpot(spotThen)}</div>
            {p.spot_then_at && <div className="small muted">recorded {p.bought_now ? fmtWhen(p.spot_then_at) : fmtDay(p.spot_then_at.slice(0, 10))}</div>}
            {spotNow > 0 && (() => { const ch = ((spotNow - spotThen) / spotThen) * 100;
              return <div className={`small ${ch >= 0 ? "up" : "down"}`}>{ch >= 0 ? "+" : ""}{ch.toFixed(1)}% since</div>; })()}
          </>
        ) : (
          <><div className="warn">Pending</div><div className="small muted">no price recorded</div></>
        )}
      </td>
      <td className="r num">
        <div>{paid != null ? usd(paid) : "—"}</div>
        {p.paid_from_spot
          ? <div className="small muted">at spot</div>
          : paid != null && spotThen && oz > 0 && (() => {
              // Premium over melt: what you paid minus the metal's value at spot that day
              const melt = oz * spotThen, prem = paid - melt, pct = (prem / melt) * 100;
              return (
                <div className="small muted" title={`Melt value when bought: ${usd(melt)}`}>
                  {prem >= 0 ? "+" : "-"}{usd(Math.abs(prem))} over melt ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                </div>
              );
            })()}
      </td>
      <td className="r num">
        <div>{usd(worth)}</div>
        {paid != null && spotNow > 0 && (
          <div className={`small ${worth - paid >= 0 ? "up" : "down"}`}>{worth - paid >= 0 ? "+" : "-"}{usd(Math.abs(worth - paid))}</div>
        )}
      </td>
      <td className="r">
        {confirming ? (
          <span className="confirm">
            <button type="button" style={{ color: "var(--down)" }} disabled={busy} onClick={remove}>Remove</button>
            <button type="button" autoFocus onClick={() => setConfirming(false)}>Keep</button>
          </span>
        ) : (
          <span className="row-actions">
            <button type="button" className="link" aria-label={`Edit ${p.description || "purchase"}`} onClick={() => setEditing((e) => !e)}>{editing ? "Close" : "Edit"}</button>
            <button type="button" className="link" aria-label={`Remove ${p.description || "purchase"}`} onClick={() => setConfirming(true)}>Remove</button>
          </span>
        )}
      </td>
    </tr>
    {editing && (
      <tr className="edit-row"><td colSpan={7}>
        <EditForm p={p} store={store} onCancel={() => setEditing(false)} onSaved={(row) => { onUpdated(row); setEditing(false); }} />
      </td></tr>
    )}
    </>
  );
}

// Edit an existing purchase. Metal and date stay fixed, because the recorded spot price depends on them.
function EditForm({ p, store, onCancel, onSaved }: { p: Purchase; store: PurchaseStore; onCancel: () => void; onSaved: (p: Purchase) => void }) {
  const grades = GRADES[p.metal];
  const startGrade = grades.findIndex((g) => Math.abs(g[1] - Number(p.purity)) < 1e-6);
  const [description, setDescription] = useState(p.description ?? "");
  const [qty, setQty] = useState(String(Number(p.qty)));
  const [weight, setWeight] = useState(String(Number(p.weight)));
  const [unit, setUnit] = useState<Unit>(p.unit);
  const [grade, setGrade] = useState(startGrade >= 0 ? String(startGrade) : "custom");
  const [customPurity, setCustomPurity] = useState(String(Number(p.purity)));
  const [paid, setPaid] = useState(p.paid_from_spot || p.paid == null ? "" : String(Number(p.paid)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const id = (k: string) => `e-${p.id}-${k}`;

  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const purity = grade === "custom" ? parseFloat(customPurity) : grades[Number(grade)][1];
    if (!(parseFloat(qty) > 0) || !(parseFloat(weight) > 0)) return setMsg("Enter a quantity and a weight.");
    if (!(purity > 0 && purity <= 1)) return setMsg("Purity must be a decimal between 0 and 1, like 0.925.");
    if (paid.trim() !== "" && !(parseFloat(paid) >= 0)) return setMsg("Total paid must be a dollar amount.");
    setBusy(true);
    try {
      const row = await store.update(p.id, {
        description: description.trim() || null, qty: parseFloat(qty), weight: parseFloat(weight), unit, purity,
        grade: grade === "custom" ? null : grades[Number(grade)][0],
        paid: paid.trim() === "" ? null : parseFloat(paid),
      });
      onSaved(row);
    } catch {
      setBusy(false); setMsg("Couldn't save. Check your connection and try again.");
    }
  }

  return (
    <form className="edit-form" onSubmit={save} autoComplete="off">
      <div className="grid">
        <div className="field wide"><label htmlFor={id("d")}>Description</label>
          <input id={id("d")} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="field"><label htmlFor={id("q")}>Quantity</label>
          <input id={id("q")} className="num" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        <div className="field"><label htmlFor={id("w")}>Weight each</label>
          <input id={id("w")} className="num" type="number" min="0" step="any" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
        <div className="field"><label htmlFor={id("u")}>Unit</label>
          <select id={id("u")} value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {(Object.keys(UNITS) as Unit[]).map((u) => <option key={u} value={u}>{UNITS[u].label}</option>)}
          </select></div>
        <div className="field"><label htmlFor={id("g")}>Purity</label>
          <select id={id("g")} value={grade} onChange={(e) => setGrade(e.target.value)}>
            {grades.map(([name], i) => <option key={name} value={String(i)}>{name}</option>)}
            <option value="custom">Enter a number…</option>
          </select>
          {grade === "custom" && <input className="num" type="number" min="0" max="1" step="any" inputMode="decimal" aria-label="Purity as a decimal"
            value={customPurity} onChange={(e) => setCustomPurity(e.target.value)} />}</div>
        <div className="field"><label htmlFor={id("p")}>Total paid ($)</label>
          <input id={id("p")} className="num" type="number" min="0" step="any" inputMode="decimal" placeholder="Blank = spot price" value={paid} onChange={(e) => setPaid(e.target.value)} />
          <span className="small muted">Leave blank to log it at the spot price when bought.</span></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        The metal ({METALS[p.metal].name.toLowerCase()}) and date can&apos;t be changed, because the recorded spot price depends on them. To change those, remove this purchase and log it again.
      </p>
      <div className="actions">
        <button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
        {msg && <span className="msg bad">{msg}</span>}
      </div>
    </form>
  );
}
