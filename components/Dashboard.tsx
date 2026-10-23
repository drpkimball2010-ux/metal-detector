"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { METALS, METAL_KEYS, fineOz, fmtOz, fmtWhen, usd, type Metal, type Purchase, type SpotRow } from "@/lib/metals";
import AddPurchase from "./AddPurchase";
import PurchaseList from "./PurchaseList";

export type Prices = Partial<Record<Metal, SpotRow>>;

export default function Dashboard({ session }: { session: Session }) {
  const [prices, setPrices] = useState<Prices>({});
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadPrices = useCallback(async () => {
    const { data, error } = await supabase.from("spot_prices").select("*");
    if (error) { setLoadError("Spot prices couldn't load. Check your connection and reload."); return; }
    const next: Prices = {};
    for (const r of data ?? []) next[r.metal as Metal] = { ...r, price: Number(r.price) } as SpotRow;
    setPrices(next);
  }, []);

  const loadPurchases = useCallback(async () => {
    const { data, error } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
    if (error) { setLoadError("Your purchases couldn't load. Check your connection and reload."); return; }
    setPurchases((data ?? []) as Purchase[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadPrices(); loadPurchases();
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
    const by = Object.fromEntries(METAL_KEYS.map((k) => [k, { oz: 0, val: 0 }])) as Record<Metal, { oz: number; val: number }>;
    let total = 0, cost = 0;
    for (const p of purchases) {
      const oz = fineOz(p), v = oz * (prices[p.metal]?.price ?? 0);
      by[p.metal].oz += oz; by[p.metal].val += v; total += v; cost += Number(p.paid ?? 0);
    }
    return { by, total, cost };
  }, [purchases, prices]);

  const newest = Object.values(prices).reduce<string | null>((a, r) => (!a || (r && r.updated_at > a) ? r?.updated_at ?? a : a), null);
  const quotedAt = Object.values(prices).reduce<string | null>((a, r) => (!a || (r && r.quoted_at > a) ? r?.quoted_at ?? a : a), null);
  const stale = newest ? Date.now() - Date.parse(newest) > 30 * 60 * 1000 : true;
  const gain = summary.total - summary.cost;

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /><h1>Metal Stack</h1></div>
        <div className="actions">
          <span className="small muted">{session.user.email}</span>
          <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

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
            <div className="small muted num">{fmtOz(summary.by[k].oz)} fine ozt</div>
          </div>
        ))}
      </div>

      <section>
        <div className="sechead">
          <h2>Spot prices</h2>
          <span className={`live ${stale ? "stale" : ""}`}>
            <span className="dot" aria-hidden="true" />
            {quotedAt ? `USD per troy oz · as of ${fmtWhen(quotedAt)}` : "Loading prices…"}
          </span>
        </div>
        <div className="tiles spot">
          {METAL_KEYS.map((k) => (
            <div className="tile" key={k}>
              <div className="name"><span className="chip" style={{ background: METALS[k].color }} />{METALS[k].name}</div>
              <div className="val num">{prices[k] ? usd(prices[k]!.price) : "—"}</div>
              <div className="small muted">per troy oz</div>
            </div>
          ))}
        </div>
      </section>

      <PurchaseList purchases={purchases} prices={prices} loaded={loaded}
        onDeleted={(id) => setPurchases((ps) => ps.filter((p) => p.id !== id))} />

      <AddPurchase prices={prices} onAdded={(p) => setPurchases((ps) => [p, ...ps])} />

      <p className="muted small" style={{ margin: 0 }}>
        Melt value is fine metal weight × spot price. Spot prices update automatically and can&apos;t be edited.
        &quot;Spot when bought&quot; uses the price recorded for that day, back to January 1, 2026. Dealers usually buy back
        somewhat below spot, and graded or collectible coins can sell above it.
      </p>
    </main>
  );
}
