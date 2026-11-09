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
        ["Coin silver, 90% (.900)", 0.9], ["80% (.800)", 0.8], ["50% (.500)", 0.5], ["40% (.400)", 0.4], ["War nickel, 35% (.350)", 0.35]],
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
  { id: "sbr", name: "Silver Britannia 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "Silver Britannia 1 oz" },
  { id: "sph", name: "Silver Philharmonic 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "Silver Philharmonic 1 oz" },
  { id: "skg", name: "Silver Kangaroo 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.9999, label: "Silver Kangaroo 1 oz" },
  { id: "skb", name: "Silver Kookaburra 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "Silver Kookaburra 1 oz" },
  { id: "sko", name: "Silver Koala 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "Silver Koala 1 oz" },
  { id: "slu", name: "Perth Mint Lunar 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "Perth Mint Silver Lunar 1 oz" },
  { id: "slb", name: "Mexican Silver Libertad 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "Silver Libertad 1 oz" },
  { id: "skr", name: "Silver Krugerrand 1 oz", metals: ["XAG"], weight: 1, unit: "ozt", purity: 0.999, label: "Silver Krugerrand 1 oz" },
  { id: "spa", name: "Chinese Silver Panda 30 g", metals: ["XAG"], weight: 30, unit: "g", purity: 0.999, label: "Silver Panda 30 g" },
  { id: "sqb", name: "Queen's Beasts 2 oz", metals: ["XAG"], weight: 2, unit: "ozt", purity: 0.9999, label: "Queen's Beasts 2 oz" },
  { id: "satb", name: "America the Beautiful 5 oz", metals: ["XAG"], weight: 5, unit: "ozt", purity: 0.999, label: "America the Beautiful 5 oz" },
  { id: "sb10", name: "Silver bar 10 oz", metals: ["XAG"], weight: 10, unit: "ozt", purity: 0.999, label: "Silver bar 10 oz" },
  { id: "sbkg", name: "Silver bar 1 kilo", metals: ["XAG"], weight: 1, unit: "kg", purity: 0.999, label: "Silver bar 1 kilo" },
  { id: "sb100", name: "Silver bar 100 oz", metals: ["XAG"], weight: 100, unit: "ozt", purity: 0.999, label: "Silver bar 100 oz" },
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
export type JunkCoin = {
  id: string; name: string; metal: Metal; weight: number; unit: Unit; purity: number; face: number; label: string;
  group: string; cur?: string; mixed?: boolean;
};
const US = "US silver coins", CA = "Canadian silver coins (face in C$)", CU = "Copper coins";
export const JUNK: JunkCoin[] = [
  { id: "j-dime", name: "90% dimes: Roosevelt, Mercury, Barber, Seated (1964 and earlier)", metal: "XAG", weight: 2.5, unit: "g", purity: 0.9, face: 0.1, label: "90% silver dimes", group: US },
  { id: "j-quarter", name: "90% quarters: Washington, Standing Liberty, Barber (1964 and earlier)", metal: "XAG", weight: 6.25, unit: "g", purity: 0.9, face: 0.25, label: "90% silver quarters", group: US },
  { id: "j-half", name: "90% halves: 1964 Kennedy, Franklin, Walking Liberty, Barber", metal: "XAG", weight: 12.5, unit: "g", purity: 0.9, face: 0.5, label: "90% silver half dollars", group: US },
  { id: "j-dollar", name: "Morgan, Peace or Seated Liberty dollars (90%)", metal: "XAG", weight: 26.73, unit: "g", purity: 0.9, face: 1, label: "Morgan / Peace silver dollars", group: US },
  { id: "j-mixed", name: "90% mixed coins (face value only)", metal: "XAG", weight: 0.8038, unit: "ozt", purity: 0.9, face: 1, label: "90% junk silver, mixed", group: US, mixed: true },
  { id: "j-40", name: "40% Kennedy halves (1965–1970)", metal: "XAG", weight: 11.5, unit: "g", purity: 0.4, face: 0.5, label: "40% silver Kennedy halves", group: US },
  { id: "j-ike", name: "40% Eisenhower \"Ike\" dollars (1971–1976, S mint silver)", metal: "XAG", weight: 24.59, unit: "g", purity: 0.4, face: 1, label: "40% silver Eisenhower dollars", group: US },
  { id: "j-bq", name: "40% Bicentennial quarters (1976-S silver)", metal: "XAG", weight: 5.75, unit: "g", purity: 0.4, face: 0.25, label: "40% silver Bicentennial quarters", group: US },
  { id: "j-war", name: "War nickels, 35% (1942–1945)", metal: "XAG", weight: 5, unit: "g", purity: 0.35, face: 0.05, label: "35% silver war nickels", group: US },
  { id: "j-trade", name: "Trade dollars (1873–1885, 90%)", metal: "XAG", weight: 27.22, unit: "g", purity: 0.9, face: 1, label: "Silver trade dollars", group: US },
  { id: "j-20c", name: "Twenty-cent pieces (1875–1878, 90%)", metal: "XAG", weight: 5, unit: "g", purity: 0.9, face: 0.2, label: "Twenty-cent pieces", group: US },
  { id: "j-hd", name: "Half dimes (1853–1873, 90%)", metal: "XAG", weight: 1.24, unit: "g", purity: 0.9, face: 0.05, label: "Silver half dimes", group: US },
  { id: "j-3c", name: "Three-cent silver \"trimes\" (1854–1873, 90%)", metal: "XAG", weight: 0.75, unit: "g", purity: 0.9, face: 0.03, label: "Three-cent silver pieces", group: US },
  { id: "j-cdol", name: "Commemorative silver dollars (1983–2018, 90%)", metal: "XAG", weight: 26.73, unit: "g", purity: 0.9, face: 1, label: "Commemorative silver dollars", group: US },
  { id: "j-cdol9", name: "Commemorative silver dollars (2019 and later, 99.9%)", metal: "XAG", weight: 26.73, unit: "g", purity: 0.999, face: 1, label: "Commemorative silver dollars (.999)", group: US },
  { id: "j-chalf", name: "Commemorative silver half dollars (90%)", metal: "XAG", weight: 12.5, unit: "g", purity: 0.9, face: 0.5, label: "Commemorative silver half dollars", group: US },
  { id: "j-pd", name: "Silver proof dimes (2019 and later, 99.9%)", metal: "XAG", weight: 2.537, unit: "g", purity: 0.999, face: 0.1, label: "Silver proof dimes (.999)", group: US },
  { id: "j-pq", name: "Silver proof quarters (2019 and later, 99.9%)", metal: "XAG", weight: 6.343, unit: "g", purity: 0.999, face: 0.25, label: "Silver proof quarters (.999)", group: US },
  { id: "j-ph", name: "Silver proof half dollars (2019 and later, 99.9%)", metal: "XAG", weight: 12.685, unit: "g", purity: 0.999, face: 0.5, label: "Silver proof half dollars (.999)", group: US },
  { id: "c-dime", name: "80% dimes (1967 and earlier)", metal: "XAG", weight: 2.33, unit: "g", purity: 0.8, face: 0.1, label: "Canadian 80% silver dimes", group: CA, cur: "C$" },
  { id: "c-quarter", name: "80% quarters (1967 and earlier)", metal: "XAG", weight: 5.83, unit: "g", purity: 0.8, face: 0.25, label: "Canadian 80% silver quarters", group: CA, cur: "C$" },
  { id: "c-half", name: "80% half dollars (1967 and earlier)", metal: "XAG", weight: 11.66, unit: "g", purity: 0.8, face: 0.5, label: "Canadian 80% silver half dollars", group: CA, cur: "C$" },
  { id: "c-dollar", name: "80% silver dollars (1935–1967)", metal: "XAG", weight: 23.33, unit: "g", purity: 0.8, face: 1, label: "Canadian 80% silver dollars", group: CA, cur: "C$" },
  { id: "c-50d", name: "50% dimes (1967–1968)", metal: "XAG", weight: 2.33, unit: "g", purity: 0.5, face: 0.1, label: "Canadian 50% silver dimes", group: CA, cur: "C$" },
  { id: "c-50q", name: "50% quarters (1967–1968)", metal: "XAG", weight: 5.83, unit: "g", purity: 0.5, face: 0.25, label: "Canadian 50% silver quarters", group: CA, cur: "C$" },
  { id: "j-penny", name: "Pre-1982 copper pennies", metal: "XCU", weight: 3.11, unit: "g", purity: 0.95, face: 0.01, label: "Pre-1982 copper pennies", group: CU },
];
export const faceStr = (n: number, cur = "$") => cur + n.toFixed(2);

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
