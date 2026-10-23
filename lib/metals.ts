// Shared metal data and math. The fine-ounce formula matches the database's fine_oz().

export type Metal = "XAU" | "XAG" | "XPT" | "XPD";
export type Unit = "ozt" | "g" | "kg" | "dwt" | "oz";

export const METALS: Record<Metal, { name: string; color: string }> = {
  XAU: { name: "Gold", color: "var(--au)" },
  XAG: { name: "Silver", color: "var(--ag)" },
  XPT: { name: "Platinum", color: "var(--pt)" },
  XPD: { name: "Palladium", color: "var(--pd)" },
};
export const METAL_KEYS = Object.keys(METALS) as Metal[];

export const UNITS: Record<Unit, { label: string; short: string; toOzt: number }> = {
  ozt: { label: "troy oz", short: "ozt", toOzt: 1 },
  g: { label: "grams", short: "g", toOzt: 1 / 31.1034768 },
  kg: { label: "kilograms", short: "kg", toOzt: 1000 / 31.1034768 },
  dwt: { label: "pennyweight", short: "dwt", toOzt: 0.05 },
  oz: { label: "ounces (avdp)", short: "oz", toOzt: 28.349523125 / 31.1034768 },
};

// Named purity grades per metal: [label, fraction]
export const GRADES: Record<Metal, [string, number][]> = {
  XAU: [["24k fine (.999)", 0.999], ["24k four nines (.9999)", 0.9999], ["22k (.9167)", 0.9167], ["21k (.875)", 0.875],
        ["18k (.750)", 0.75], ["14k (.585)", 0.585], ["10k (.417)", 0.417], ["9k (.375)", 0.375]],
  XAG: [["Fine (.999)", 0.999], ["Four nines (.9999)", 0.9999], ["Britannia (.958)", 0.958], ["Sterling (.925)", 0.925],
        ["Coin silver, 90% (.900)", 0.9], ["80% (.800)", 0.8], ["40% (.400)", 0.4], ["War nickel, 35% (.350)", 0.35]],
  XPT: [["Fine (.9995)", 0.9995], ["Fine (.999)", 0.999], ["950 platinum (.950)", 0.95], ["900 platinum (.900)", 0.9],
        ["850 platinum (.850)", 0.85]],
  XPD: [["Fine (.9995)", 0.9995], ["Fine (.999)", 0.999], ["950 palladium (.950)", 0.95], ["500 palladium (.500)", 0.5]],
};

export type Preset = { id: string; name: string; metals: Metal[] | "*"; weight?: number; unit?: Unit; purity?: number; label?: string };
export const PRESETS: Preset[] = [
  { id: "custom", name: "Custom", metals: "*" },
  { id: "bar", name: "Bar or round (fine)", metals: "*", weight: 1, unit: "ozt" },
  { id: "age", name: "American Gold Eagle 1 oz", metals: ["XAU"], weight: 1.0909, unit: "ozt", purity: 0.9167, label: "American Gold Eagle 1 oz" },
  { id: "agb", name: "American Gold Buffalo 1 oz", metals: ["XAU"], weight: 1, unit: "ozt", purity: 0.9999, label: "American Gold Buffalo 1 oz" },
  { id: "krug", name: "Krugerrand 1 oz", metals: ["XAU"], weight: 1.0909, unit: "ozt", purity: 0.9167, label: "Krugerrand 1 oz" },
  { id: "gml", name: "Gold Maple Leaf 1 oz", metals: ["XAU"], weight: 1, unit: "ozt", purity: 0.9999, label: "Gold Maple Leaf 1 oz" },
  { id: "ase", name: "American Silver Eagle 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "American Silver Eagle 1 oz" },
  { id: "sml", name: "Silver Maple Leaf 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.9999, label: "Silver Maple Leaf 1 oz" },
  { id: "junk", name: "90% junk silver ($1 face)", metals: ["XAG"], weight: 0.8038, unit: "ozt", purity: 0.9, label: "90% junk silver, $1 face" },
  { id: "ster", name: "Sterling flatware / jewelry", metals: ["XAG"], weight: 1, unit: "g", purity: 0.925, label: "Sterling silver" },
  { id: "ape", name: "American Platinum Eagle 1 oz", metals: ["XPT"], weight: 1, unit: "ozt", purity: 0.9995, label: "American Platinum Eagle 1 oz" },
];

export type SpotRow = { metal: Metal; price: number; quoted_at: string; source: string | null; updated_at: string };

export type Purchase = {
  id: string;
  metal: Metal;
  description: string | null;
  qty: number;
  weight: number;
  unit: Unit;
  purity: number;
  grade: string | null;
  bought_now: boolean;
  bought_on: string | null;
  paid: number | null;
  paid_from_spot: boolean;
  spot_then: number | null;
  spot_then_at: string | null;
  created_at: string;
};

export function fineOz(p: { qty: number; weight: number; unit: Unit; purity: number }): number {
  return Number(p.qty) * Number(p.weight) * (UNITS[p.unit]?.toOzt ?? 1) * Number(p.purity);
}

export const usd = (n: number) =>
  (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtOz = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const fmtDay = (isoDate: string) =>
  new Date(isoDate + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
