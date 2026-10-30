// Shared metal data and math. The fine-ounce formula matches the database's fine_oz().

export type Metal = "XAU" | "XAG" | "XPT" | "XPD" | "XRH" | "XCU";
export type Unit = "ozt" | "g" | "kg" | "dwt" | "oz";

export const METALS: Record<Metal, { name: string; color: string }> = {
  XAU: { name: "Gold", color: "var(--au)" },
  XAG: { name: "Silver", color: "var(--ag)" },
  XPT: { name: "Platinum", color: "var(--pt)" },
  XPD: { name: "Palladium", color: "var(--pd)" },
  XRH: { name: "Rhodium", color: "var(--rh)" },
  XCU: { name: "Copper", color: "var(--cu)" },
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
  XRH: [["Fine (.9995)", 0.9995], ["Fine (.999)", 0.999]],
  XCU: [["Fine (.999)", 0.999], ["Four nines (.9999)", 0.9999], ["Pre-1982 US penny, 95% (.950)", 0.95]],
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
  { id: "ster", name: "Sterling flatware / jewelry", metals: ["XAG"], weight: 1, unit: "g", purity: 0.925, label: "Sterling silver" },
  { id: "ape", name: "American Platinum Eagle 1 oz", metals: ["XPT"], weight: 1, unit: "ozt", purity: 0.9995, label: "American Platinum Eagle 1 oz" },
  { id: "rhg", name: "Rhodium bar 1 g", metals: ["XRH"], weight: 1, unit: "g", purity: 0.9995, label: "Rhodium bar 1 g" },
  { id: "rhoz", name: "Rhodium round 1 oz", metals: ["XRH"], weight: 1, unit: "ozt", purity: 0.9995, label: "Rhodium 1 oz" },
  { id: "cur", name: "Copper round 1 oz (avdp)", metals: ["XCU"], weight: 1, unit: "oz", purity: 0.999, label: "Copper round 1 oz" },
  { id: "cub", name: "Copper bar 1 lb", metals: ["XCU"], weight: 16, unit: "oz", purity: 0.999, label: "Copper bar 1 lb" },
];

// Junk coins: US circulation coins valued for their metal. Enter the face value or the number of coins.
// weight/unit/purity are per coin. "Mixed" is priced per $1 of face ($1 of 90% coins holds about 0.7234 oz of pure silver, allowing for wear),
// so only face value makes sense for it.
export type JunkCoin = { id: string; name: string; metal: Metal; weight: number; unit: Unit; purity: number; face: number; label: string; mixed?: boolean };
export const JUNK: JunkCoin[] = [
  { id: "j-dime", name: "90% dimes (1964 and earlier)", metal: "XAG", weight: 2.5, unit: "g", purity: 0.9, face: 0.1, label: "90% silver dimes" },
  { id: "j-quarter", name: "90% quarters (1964 and earlier)", metal: "XAG", weight: 6.25, unit: "g", purity: 0.9, face: 0.25, label: "90% silver quarters" },
  { id: "j-half", name: "90% half dollars (1964 and earlier)", metal: "XAG", weight: 12.5, unit: "g", purity: 0.9, face: 0.5, label: "90% silver half dollars" },
  { id: "j-dollar", name: "Morgan or Peace dollars (90%)", metal: "XAG", weight: 26.73, unit: "g", purity: 0.9, face: 1, label: "Morgan / Peace silver dollars" },
  { id: "j-mixed", name: "90% mixed coins (face value only)", metal: "XAG", weight: 0.8038, unit: "ozt", purity: 0.9, face: 1, label: "90% junk silver, mixed", mixed: true },
  { id: "j-40", name: "40% Kennedy halves (1965–1970)", metal: "XAG", weight: 11.5, unit: "g", purity: 0.4, face: 0.5, label: "40% silver Kennedy halves" },
  { id: "j-war", name: "War nickels, 35% (1942–1945)", metal: "XAG", weight: 5, unit: "g", purity: 0.35, face: 0.05, label: "35% silver war nickels" },
  { id: "j-penny", name: "Pre-1982 copper pennies", metal: "XCU", weight: 3.11, unit: "g", purity: 0.95, face: 0.01, label: "Pre-1982 copper pennies" },
];
export const faceStr = (n: number) => "$" + n.toFixed(2);

// Prices under $10 (copper) get more decimal places
export const usdSpot = (n: number) =>
  n > 0 && n < 10 ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : usd(n);

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
