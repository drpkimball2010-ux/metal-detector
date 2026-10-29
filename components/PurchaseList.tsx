"use client";

import { useState } from "react";
import type { PurchaseStore } from "@/lib/store";
import { METALS, UNITS, fineOz, fmtDay, fmtOz, fmtWhen, usd, usdSpot, type Purchase } from "@/lib/metals";
import type { Prices } from "./Dashboard";

export default function PurchaseList({ purchases, prices, loaded, store, onDeleted }: {
  purchases: Purchase[]; prices: Prices; loaded: boolean; store: PurchaseStore; onDeleted: (id: string) => void;
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
            {sorted.map((p) => <Row key={p.id} p={p} prices={prices} store={store} onDeleted={onDeleted} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ p, prices, store, onDeleted }: { p: Purchase; prices: Prices; store: PurchaseStore; onDeleted: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
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
    <tr>
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
          <button type="button" className="link" aria-label={`Remove ${p.description || "purchase"}`} onClick={() => setConfirming(true)}>Remove</button>
        )}
      </td>
    </tr>
  );
}
