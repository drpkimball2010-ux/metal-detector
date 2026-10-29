// Where purchases are saved. Signed-in users: their Supabase account.
// Demo visitors: this browser only (nothing is sent to the database).
import { supabase } from "./supabase";
import { fineOz, type Metal, type Purchase, type Unit } from "./metals";

export type NewPurchase = {
  metal: Metal; description: string | null; qty: number; weight: number; unit: Unit;
  purity: number; grade: string | null; bought_now: boolean; bought_on: string | null; paid: number | null;
};

export interface PurchaseStore {
  list(): Promise<Purchase[]>;
  add(p: NewPurchase): Promise<Purchase>;
  remove(id: string): Promise<void>;
}

// Nearest recorded price within 72 hours of midday on a date (the same rule the database uses)
export async function spotOnDay(metal: Metal, day: string): Promise<{ price: number; at: string } | null> {
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

// ---------- Signed-in: Supabase ----------
export const accountStore: PurchaseStore = {
  async list() {
    const { data, error } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Purchase[];
  },
  async add(p) {
    // The database fills in the spot price and "paid at spot" itself
    const { data, error } = await supabase.from("purchases").insert(p).select().single();
    if (error) throw error;
    return data as Purchase;
  },
  async remove(id) {
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- Demo: this browser only ----------
const DEMO_KEY = "tms-demo-v2";

function readDemo(): Purchase[] | null {
  try { const s = localStorage.getItem(DEMO_KEY); return s ? (JSON.parse(s) as Purchase[]) : null; } catch { return null; }
}
function writeDemo(rows: Purchase[]) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(rows)); } catch { /* private browsing: demo still works for this visit */ }
}
function newId() {
  try { return crypto.randomUUID(); } catch { return "demo-" + Math.random().toString(36).slice(2); }
}

// A realistic starter stack so the demo isn't empty
const DEMO_SEED: NewPurchase[] = [
  { metal: "XAG", description: "American Silver Eagle 1 oz", qty: 20, weight: 1, unit: "ozt", purity: 0.999, grade: "Fine (.999)", bought_now: false, bought_on: "2026-07-16", paid: null },
  { metal: "XAU", description: "American Gold Eagle 1 oz", qty: 1, weight: 1.0909, unit: "ozt", purity: 0.9167, grade: "22k (.9167)", bought_now: false, bought_on: "2026-07-16", paid: null },
  { metal: "XAG", description: "90% junk silver, $1 face", qty: 5, weight: 0.8038, unit: "ozt", purity: 0.9, grade: "Coin silver, 90% (.900)", bought_now: false, bought_on: "2026-07-20", paid: null },
  { metal: "XPT", description: "American Platinum Eagle 1 oz", qty: 1, weight: 1, unit: "ozt", purity: 0.9995, grade: "Fine (.9995)", bought_now: false, bought_on: "2026-07-01", paid: null },
  { metal: "XCU", description: "Copper round 1 oz", qty: 25, weight: 1, unit: "oz", purity: 0.999, grade: "Fine (.999)", bought_now: true, bought_on: null, paid: null },
];

export function demoStore(currentSpot: (m: Metal) => { price: number; at: string } | null): PurchaseStore & { reset(): Promise<Purchase[]> } {
  async function build(p: NewPurchase): Promise<Purchase> {
    const hit = p.bought_now ? currentSpot(p.metal) : p.bought_on ? await spotOnDay(p.metal, p.bought_on) : null;
    const paidFromSpot = p.paid == null || p.bought_now;
    const paid = paidFromSpot ? (hit ? Math.round(fineOz(p) * hit.price * 100) / 100 : null) : p.paid;
    return {
      ...p, id: newId(), paid, paid_from_spot: paidFromSpot,
      spot_then: hit?.price ?? null, spot_then_at: hit?.at ?? null, created_at: new Date().toISOString(),
    } as Purchase;
  }
  async function seed() {
    const rows: Purchase[] = [];
    for (const p of DEMO_SEED) rows.push(await build(p));
    writeDemo(rows);
    return rows;
  }
  return {
    async list() { return readDemo() ?? seed(); },
    async add(p) { const row = await build(p); writeDemo([row, ...(readDemo() ?? [])]); return row; },
    async remove(id) { writeDemo((readDemo() ?? []).filter((r) => r.id !== id)); },
    async reset() { return seed(); },
  };
}
