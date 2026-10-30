// Spreadsheet import and export. Reads the columns stackers already keep
// (date, item, weight, purity, price paid...) and turns each row into a purchase.
import { GRADES, METALS, fineOz, type Metal, type Purchase, type Unit } from "./metals";
import type { NewPurchase } from "./store";

// ---------- CSV parsing (quotes, commas inside quotes, tabs or semicolons as separators) ----------
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const sample = t.split(/\r?\n/).slice(0, 5).join("\n");
  const count = (ch: string) => sample.split(ch).length - 1;
  const sep = [",", "\t", ";"].sort((a, b) => count(b) - count(a))[0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"' && cell.trim() === "") q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  const out = rows.map((r) => r.map((x) => x.trim()));
  while (out.length && out[out.length - 1].every((x) => x === "")) out.pop();
  return out;
}

// Excel cells (numbers, Dates, booleans) -> text, so Excel and CSV go through the same reader
export function cellsToText(rows: unknown[][]): string[][] {
  const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const out = rows.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? iso(c) : String(c).trim())));
  while (out.length && out[out.length - 1].every((c) => c === "")) out.pop();
  return out; // blank rows kept so row numbers match the spreadsheet
}

// ---------- Column detection ----------
export type Field = "date" | "item" | "metal" | "qty" | "weight" | "totalWeight" | "fineWeight" | "unit" | "purity" | "paid" | "unitPrice" | "ignore";
export const FIELD_LABELS: Record<Field, string> = {
  date: "Date bought", item: "Item / description", metal: "Metal", qty: "Quantity", weight: "Weight each",
  totalWeight: "Total weight (all pieces)", fineWeight: "Pure metal weight each (ASW/AGW)", unit: "Weight unit",
  purity: "Purity", paid: "Total paid", unitPrice: "Price each", ignore: "Don't import",
};
// Checked in order; the first match wins and each field is used once.
const HEADER_HINTS: [Field, RegExp][] = [
  ["ignore", /^(year|yr|mint year|mintage)$|spot|melt|value|worth|premium|profit|gain|loss|current|market|notes?$|comment|dealer|seller|vendor|source|location|storage|serial|cert|grade[dr] by|^id$/i],
  ["date", /date|datum|fecha|bought|purchased|^when$|^day$/i],
  ["fineWeight", /\b(asw|agw|apw|apdw|fine (wt|weight|oz|ounces|g)|pure (wt|weight|oz|ounces|metal)|(silver|gold|platinum) (content|weight)|actual (silver|gold))\b/i],
  ["totalWeight", /total.*(weight|wt|oz|ounces|grams)|(weight|wt|oz|ounces).*total/i],
  ["unitPrice", /(price|cost|paid).*(each|per|unit|\/)|unit.*(price|cost)|per (coin|piece|item|unit)|each/i],
  ["paid", /paid|total|cost|price|amount|spent|\$|usd/i],
  ["metal", /^metal$|metal type|^type$|^element$|^commodity$/i],
  ["qty", /qty|quantity|count|^#$|pieces|pcs|^number$|^no\.?$|units owned|how many/i],
  ["unit", /^unit$|^units$|uom|^measure$/i],
  ["weight", /weight|wt|size|^oz$|ounces|grams|^g$|troy/i],
  ["purity", /purity|fineness|^fine$|karat|carat|^k$|millesimal|%/i],
  ["item", /item|desc|product|name|coin|bar|round|what|piece|title/i],
];
export function guessFields(header: string[]): Field[] {
  const used = new Set<Field>();
  return header.map((h) => {
    for (const [f, re] of HEADER_HINTS) {
      if (re.test(h) && (f === "ignore" || !used.has(f))) { if (f !== "ignore") used.add(f); return f; }
    }
    return "ignore";
  });
}
const headerScore = (row: string[]) =>
  row.filter((c) => c && c.length < 40 && HEADER_HINTS.slice(1).some(([, re]) => re.test(c)) && !parseMoney(c) && !parseDate(c)).length;
// Find the row with the column names. Sheets often start with a title or blank rows.
export function findHeaderRow(grid: string[][]): number {
  let best = -1, bestScore = 1;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const s = headerScore(grid[i]);
    if (s > bestScore) { best = i; bestScore = s; }
  }
  return best; // -1 = no header row (data starts at the top)
}
export const looksLikeHeader = (row: string[]) => headerScore(row) >= 2;

// Header row with names we don't recognize ("Thing", "Amt", "Wt."): the top row is all
// short words while the rows under it hold numbers, money or dates.
export function findHeaderRowAny(grid: string[][]): number {
  const h = findHeaderRow(grid);
  if (h >= 0) return h;
  const first = grid.findIndex((r) => r.some((c) => c));
  if (first < 0 || first + 1 >= grid.length) return -1;
  const top = grid[first].filter((c) => c);
  const isWordy = (c: string) => /[a-z]/i.test(c) && !/\d/.test(c) && c.length < 30;
  const below = grid.slice(first + 1, first + 6).flat().filter((c) => c);
  const numeric = below.filter((c) => /\d/.test(c)).length;
  return top.length >= 2 && top.every(isWordy) && numeric >= below.length * 0.3 ? first : -1;
}

// ---------- Reading columns by what's in them ----------
// Used for columns with no header, or a header we don't recognize. Looks at the values
// (dates, "1 oz", ".999", "$1,950.00", "Silver Eagle"...) and decides what the column holds.
type Profile = { year: number; date: number; weight: number; purity: number; metal: number; money: number; int: number; num: number; text: number; avgLen: number; median: number; n: number };
const isPurityValue = (v: string) =>
  /^\d{1,2}\s*(k|kt|karat|carat)$/i.test(v) || /^0?\.\d{2,4}$/.test(v) || /^9\d{2}(\.\d)?$|^9{4}$/.test(v) ||
  /^\d{2,3}(\.\d+)?\s*%$/.test(v) || /^(sterling|fine|pure|junk|coin silver|\.?999 fine)$/i.test(v);
function profile(values: string[]): Profile {
  const v = values.filter((x) => x).slice(0, 60);
  const n = v.length || 1;
  const frac = (f: (x: string) => boolean) => v.filter(f).length / n;
  const nums = v.map((x) => parseMoney(x)).filter((x): x is number => x != null).sort((a, b) => a - b);
  return {
    n: v.length,
    year: frac((x) => /^(17|18|19|20)\d{2}$/.test(x)),
    date: frac((x) => !!parseDate(x) && !/^\d{1,4}$/.test(x) && !/[$€£]/.test(x)),
    weight: frac((x) => /\d/.test(x) && !!parseUnit(x) && !/[$€£]/.test(x) && parseNumber(x) != null),
    purity: frac(isPurityValue),
    metal: frac((x) => /^(gold|silver|platinum|palladium|rhodium|copper|au|ag|pt|pd|rh|cu|xau|xag|xpt|xpd|xrh|xcu)$/i.test(x.trim())),
    money: frac((x) => /[$€£]/.test(x) || /^\d{1,3}(,\d{3})+(\.\d{2})?$|^\d+\.\d{2}$/.test(x)),
    int: frac((x) => /^\d{1,5}$/.test(x)),
    num: frac((x) => /^-?[\d.,]+$/.test(x) && parseMoney(x) != null),
    text: frac((x) => (x.match(/[a-z]/gi)?.length ?? 0) >= 3),
    avgLen: v.reduce((s, x) => s + x.length, 0) / n,
    median: nums.length ? nums[Math.floor(nums.length / 2)] : 0,
  };
}
// Returns a field for every column: header names first, then the values decide the rest.
export function guessColumns(grid: string[][], headerRow: number): Field[] {
  const width = Math.max(0, ...grid.slice(0, 30).map((r) => r.length));
  const header = headerRow >= 0 ? grid[headerRow] : [];
  const fromHeader = guessFields(header);
  const fields: Field[] = Array.from({ length: width }, (_, i) => fromHeader[i] ?? "ignore");
  // A header that says "Spot", "Value", "Notes"... is skipped on purpose; don't second-guess it
  const explicitIgnore = (i: number) => !!header[i] && HEADER_HINTS[0][1].test(header[i]);
  const data = grid.slice(headerRow + 1).filter((r) => !/^\s*(grand\s*)?(sub)?totals?\b/i.test(r.find((c) => c) ?? ""));
  const open = fields.map((f, i) => f === "ignore" && !explicitIgnore(i));
  const P = fields.map((_, i) => profile(data.map((r) => r[i] ?? "")));
  const used = new Set<Field>(fields.filter((f) => f !== "ignore"));
  const take = (f: Field, test: (p: Profile, i: number) => boolean, pick: "first" | "longest" = "first") => {
    if (used.has(f)) return;
    const cands = P.map((p, i) => i).filter((i) => open[i] && P[i].n > 0 && test(P[i], i));
    if (!cands.length) return;
    const i = pick === "longest" ? cands.sort((a, b) => P[b].avgLen - P[a].avgLen)[0] : cands[0];
    fields[i] = f; open[i] = false; used.add(f);
  };
  take("date", (p) => p.date >= 0.6);
  take("weight", (p) => p.weight >= 0.6);
  take("purity", (p) => p.purity >= 0.6);
  take("metal", (p) => p.metal >= 0.6);
  take("item", (p) => p.text >= 0.6 && p.money < 0.3, "longest");

  // Money columns: with a quantity, "price each × qty = total" tells them apart
  take("qty", (p) => p.int >= 0.8 && p.median <= 500 && p.money < 0.3);
  const money = P.map((p, i) => i).filter((i) => open[i] && P[i].n > 0 && P[i].year < 0.8 && (P[i].money >= 0.6 || (P[i].num >= 0.8 && P[i].median > 50)));
  const qi = fields.indexOf("qty");
  if (money.length >= 2 && qi >= 0 && !used.has("paid") && !used.has("unitPrice")) {
    outer: for (const a of money) for (const b of money) {
      if (a === b) continue;
      const rows = data.filter((r) => r[a] && r[b]);
      const hits = rows.filter((r) => {
        const t = parseMoney(r[a]), e = parseMoney(r[b]), q = parseNumber(r[qi] ?? "") ?? 1;
        return t != null && e != null && Math.abs(t - e * q) <= Math.max(0.02, t * 0.005);
      }).length;
      if (rows.length && hits / rows.length >= 0.8 && rows.some((r) => (parseNumber(r[qi] ?? "") ?? 1) !== 1)) {
        fields[a] = "paid"; fields[b] = "unitPrice"; open[a] = open[b] = false; used.add("paid"); used.add("unitPrice");
        break outer;
      }
    }
  }
  if (!used.has("paid")) {
    // Several unlabeled money columns and no way to tell: the biggest is most likely what was paid
    const rest = money.filter((i) => open[i]).sort((a, b) => P[b].median - P[a].median);
    if (rest.length) { fields[rest[0]] = "paid"; open[rest[0]] = false; used.add("paid"); }
  }
  // Plain numbers left over: small ones are weights (troy oz), unless a weight is already known
  take("weight", (p) => p.num >= 0.8 && p.median > 0 && p.median <= 100);
  return fields;
}

// ---------- Value parsing ----------
type DateOrder = "MDY" | "DMY";
export function parseDate(s: string, order: DateOrder = "MDY"): string | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{5}(\.\d+)?$/.test(t)) {                       // Excel serial date number, like 45123
    const n = Number(t);
    if (n > 20000 && n < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
  }
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);  // 2024-03-15, 2024/03/15
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);  // 3/15/2024 or 15/3/2024
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    let a = +m[1], b = +m[2];
    if (order === "DMY" || a > 12) [a, b] = [b, a];       // day first
    return iso(y, a, b);
  }
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  m = t.match(/^(\d{1,2})[\s-]+([a-z]{3})[a-z]*\.?[\s,-]+(\d{2,4})$/i); // 15-Mar-2024, 15 March 2024
  if (m && months.includes(m[2].toLowerCase())) return iso(+m[3] < 100 ? 2000 + +m[3] : +m[3], months.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  m = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(st|nd|rd|th)?,?\s+(\d{4})$/i); // March 15, 2024
  if (m && months.includes(m[1].toLowerCase())) return iso(+m[4], months.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  m = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/i);           // Mar 2024 -> 1st of the month
  if (m && months.includes(m[1].toLowerCase())) return iso(+m[2], months.indexOf(m[1].toLowerCase()) + 1, 1);
  return null;
}
function iso(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCDate() !== d) return null;                   // e.g. Feb 30
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(mo)}-${p(d)}`;
}
// If any date in the column has a first number over 12 (like 25/03/2024), the column is day-first.
function dateOrderOf(values: string[]): DateOrder {
  let dmy = 0, mdy = 0;
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/);
    if (!m) continue;
    if (+m[1] > 12 && +m[2] <= 12) dmy++;
    if (+m[2] > 12 && +m[1] <= 12) mdy++;
  }
  return dmy > mdy ? "DMY" : "MDY";
}
export function parseMoney(s: string): number | null {
  let t = s.trim().replace(/usd|us\$|\$|€|£|¥|cad|aud/gi, "").replace(/\s/g, "");
  if (t === "" || !/\d/.test(t)) return null;
  const neg = /^\(.*\)$/.test(t) || t.startsWith("-");
  t = t.replace(/[()-]/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t) || /^\d+,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", "."); // 1.234,56
  else t = t.replace(/,/g, "");
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}
function parseNumber(s: string): number | null {
  const t = s.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);    // 2 1/2
  if (mixed && +mixed[3] > 0) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)/);             // 1/10
  if (frac && +frac[2] > 0) return +frac[1] / +frac[2];
  const m = t.replace(/(\d),(\d{3})\b/g, "$1$2").match(/^-?\d*[.,]?\d+/);
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
export function parseUnit(s: string): Unit | null {
  const t = s.toLowerCase();
  if (/troy|ozt|t\.?oz|toz/.test(t)) return "ozt";
  if (/kilo|\bkg\b|\dkg/.test(t)) return "kg";
  if (/dwt|pennyweight/.test(t)) return "dwt";
  if (/\bg\b|gram|\dg\b|\bgr\b/.test(t)) return "g";
  if (/\blbs?\b|pound|\dlbs?\b/.test(t)) return "oz";       // pounds are converted to ounces below
  if (/avdp|avoir/.test(t)) return "oz";
  if (/oz|ounce/.test(t)) return "ozt";                      // bullion "oz" means troy unless it says otherwise
  return null;
}
const isPounds = (s: string) => /\blbs?\b|pound|\dlbs?\b/i.test(s);
// Weight like "1 oz", "1/10 oz", "10oz", "31.1 g", "1 lb" -> number + unit
export function parseWeight(s: string, unitHint?: string): { weight: number; unit: Unit } | null {
  const n = parseNumber(s);
  if (n == null || n <= 0) return null;
  const src = parseUnit(s) ? s : unitHint || s;
  const u = parseUnit(src) ?? "ozt";
  return isPounds(src) ? { weight: n * 16, unit: "oz" } : { weight: n, unit: u };
}
export function parsePurity(s: string): { purity: number; grade: string | null } | null {
  const t = s.toLowerCase().trim();
  if (!t) return null;
  const k = t.match(/(\d{1,2})\s*(k|kt|karat|carat)\b/);
  if (k && +k[1] >= 1 && +k[1] <= 24) {
    const kk = +k[1];
    const std = GRADES.XAU.find((g) => g[0].startsWith(`${kk}k `));
    if (std) return { purity: std[1], grade: std[0] };
    return { purity: kk === 24 ? 0.999 : Math.round((kk / 24) * 10000) / 10000, grade: `${kk}k` };
  }
  if (/sterling/.test(t)) return { purity: 0.925, grade: "Sterling (.925)" };
  if (/britannia/.test(t)) return { purity: 0.958, grade: "Britannia (.958)" };
  if (/war nickel|35\s*%/.test(t)) return { purity: 0.35, grade: "War nickel, 35% (.350)" };
  if (/40\s*%/.test(t)) return { purity: 0.4, grade: "40% (.400)" };
  if (/junk|90\s*%|coin silver/.test(t)) return { purity: 0.9, grade: "Coin silver, 90% (.900)" };
  const pct = t.match(/^(\d{1,3}(\.\d+)?)\s*%/);
  if (pct) return { purity: Math.min(+pct[1], 100) / 100, grade: null };
  const num = t.match(/^0?\.\d+|^\d+(\.\d+)?/);
  if (num) {
    const n = Number(num[0].startsWith(".") ? "0" + num[0] : num[0]);
    if (n > 0 && n <= 1) return { purity: n, grade: null };
    if (n > 1 && n <= 100) return { purity: n / 100, grade: null };           // 90 -> 90%
    if (n > 100 && n <= 1000) return { purity: n / 1000, grade: null };       // 999, 925, 999.9
    if (n > 1000 && n <= 10000) return { purity: n / 10000, grade: null };    // 9999
  }
  if (/fine|pure/.test(t)) return { purity: 0.999, grade: null };
  return null;
}
// Guess the metal from the item name, e.g. "2021 Silver Eagle" -> silver
export function guessMetal(...cells: string[]): Metal | null {
  const t = cells.join(" ").toLowerCase();
  if (/palladium|\bxpd\b|\bpd\b/.test(t)) return "XPD";
  if (/platinum|\bxpt\b|\bpt\b|\bplat\b/.test(t)) return "XPT";
  if (/rhodium|\bxrh\b|\brh\b/.test(t)) return "XRH";
  if (/copper|\bxcu\b|\bcu\b|penn(y|ies)|wheat cent|\bcents?\b/.test(t)) return "XCU";
  if (/silver|\bxag\b|\bag\b|junk|sterling|morgan|peace dollar|kennedy|mercury|roosevelt|barber|walking liberty|franklin|washington quarter|war nickel|libertad|kookaburra|philharmonic silver|\bslv\b/.test(t)) return "XAG";
  if (/gold|\bxau\b|\bau\b|krugerrand|sovereign|\d+\s*k\b|double eagle|buffalo|\bgld\b|kilo bar gold/.test(t)) return "XAU";
  return null;
}
// Well-known coins, used when the sheet leaves weight or purity blank
const KNOWN: { re: RegExp; metal: Metal; weight: number; unit: Unit; purity: number; grade: string }[] = [
  { re: /(1\/10|tenth).*gold eagle|gold eagle.*(1\/10|tenth)/i, metal: "XAU", weight: 0.1091, unit: "ozt", purity: 0.9167, grade: "22k (.9167)" },
  { re: /(1\/4|quarter).*gold eagle|gold eagle.*(1\/4|quarter)/i, metal: "XAU", weight: 0.2727, unit: "ozt", purity: 0.9167, grade: "22k (.9167)" },
  { re: /(1\/2|half).*gold eagle|gold eagle.*(1\/2|half)/i, metal: "XAU", weight: 0.5455, unit: "ozt", purity: 0.9167, grade: "22k (.9167)" },
  { re: /gold eagle|american eagle.*gold/i, metal: "XAU", weight: 1.0909, unit: "ozt", purity: 0.9167, grade: "22k (.9167)" },
  { re: /krugerrand/i, metal: "XAU", weight: 1.0909, unit: "ozt", purity: 0.9167, grade: "22k (.9167)" },
  { re: /sovereign/i, metal: "XAU", weight: 7.988, unit: "g", purity: 0.9167, grade: "22k (.9167)" },
  { re: /gold buffalo|buffalo.*gold/i, metal: "XAU", weight: 1, unit: "ozt", purity: 0.9999, grade: "24k four nines (.9999)" },
  { re: /gold maple/i, metal: "XAU", weight: 1, unit: "ozt", purity: 0.9999, grade: "24k four nines (.9999)" },
  { re: /silver eagle/i, metal: "XAG", weight: 1, unit: "ozt", purity: 0.999, grade: "Fine (.999)" },
  { re: /silver maple|maple leaf/i, metal: "XAG", weight: 1, unit: "ozt", purity: 0.9999, grade: "Four nines (.9999)" },
  { re: /britannia/i, metal: "XAG", weight: 1, unit: "ozt", purity: 0.999, grade: "Fine (.999)" },
  { re: /morgan|peace dollar/i, metal: "XAG", weight: 26.73, unit: "g", purity: 0.9, grade: "Coin silver, 90% (.900)" },
  { re: /kennedy half|franklin half|walking liberty half/i, metal: "XAG", weight: 12.5, unit: "g", purity: 0.9, grade: "Coin silver, 90% (.900)" },
  { re: /quarter/i, metal: "XAG", weight: 6.25, unit: "g", purity: 0.9, grade: "Coin silver, 90% (.900)" },
  { re: /\bdimes?\b/i, metal: "XAG", weight: 2.5, unit: "g", purity: 0.9, grade: "Coin silver, 90% (.900)" },
  { re: /war nickel/i, metal: "XAG", weight: 5, unit: "g", purity: 0.35, grade: "War nickel, 35% (.350)" },
  { re: /platinum eagle/i, metal: "XPT", weight: 1, unit: "ozt", purity: 0.9995, grade: "Fine (.9995)" },
  { re: /pre.?1982 penn|copper penn|wheat (penn|cent)/i, metal: "XCU", weight: 3.11, unit: "g", purity: 0.95, grade: "Pre-1982 US penny, 95% (.950)" },
];
// "$10 face" of 90% silver coins = 7.234 troy oz of pure silver
const FACE_FINE_OZ_PER_DOLLAR = 0.7234;

export type ImportRow = { line: number; purchase: NewPurchase | null; problems: string[]; skipped?: string; raw: string[] };

export function buildRows(rows: string[][], fields: Field[], firstLine = 1, header: string[] = []): ImportRow[] {
  // A weight column titled "Grams" or "Weight (g)" with bare numbers means grams
  const fieldUnit = (f: Field) => { const h = header[fields.indexOf(f)] ?? ""; return parseUnit(h) ? h : ""; };
  const at = (f: Field) => fields.indexOf(f);
  const col = (r: string[], f: Field) => { const i = at(f); return i >= 0 ? (r[i] ?? "") : ""; };
  const order = dateOrderOf(rows.map((r) => col(r, "date")));
  const today = new Date().toISOString().slice(0, 10);

  return rows.map((r, idx) => {
    const line = idx + firstLine;
    const item = col(r, "item");
    const joined = r.join(" ").toLowerCase();

    // Summary and empty rows are skipped quietly
    if (/^\s*(grand\s*)?(sub)?totals?\b|^\s*sum\b|^\s*average\b/i.test(item || r.find((c) => c) || ""))
      return { line, raw: r, problems: [], purchase: null, skipped: "Looks like a totals row" };
    if (r.every((c) => !c)) return { line, raw: r, problems: [], purchase: null, skipped: "Empty row" };
    if (/\b(sold|sell|sale)\b/.test(joined) && !/\bbought|buy\b/.test(joined))
      return { line, raw: r, problems: [], purchase: null, skipped: "Looks like a sale, not a purchase" };

    const problems: string[] = [];
    // Text in columns not used for anything else ("Silver", "Eagle", "1 oz") still counts
    const spare = r.filter((c, i) => c && (fields[i] ?? "ignore") === "ignore" && !(header[i] && HEADER_HINTS[0][1].test(header[i])) && /[a-z]/i.test(c));
    const known = KNOWN.find((k) => k.re.test(item)) ?? KNOWN.find((k) => k.re.test(spare.join(" ")));
    const metal = (col(r, "metal") && guessMetal(col(r, "metal"))) || guessMetal(item, col(r, "purity")) || known?.metal || guessMetal(...spare) || null;
    if (!metal) problems.push("Couldn't tell the metal. Add a Metal column or put the metal in the item name.");

    // Quantity: its own column, or "20 x 1 oz" / "Tube of 25" in the item name
    const qtyFromItem = item.match(/^\s*(\d+)\s*[x×]\s*\S/i)?.[1] ?? item.match(/\b(tube|roll|lot|box) of (\d+)/i)?.[2] ?? item.match(/\((\d+)\)\s*$/)?.[1] ?? item.match(/\s[x×]\s?(\d+)\s*$/i)?.[1];
    const qtyCell = col(r, "qty");
    let qty = qtyCell ? parseNumber(qtyCell) : qtyFromItem ? Number(qtyFromItem) : 1;
    if (qty != null && qty < 0) return { line, raw: r, problems: [], purchase: null, skipped: "Negative quantity, looks like a sale" };
    if (qty == null || !(qty > 0)) { problems.push(`Couldn't read the quantity "${qtyCell}".`); qty = 1; }

    // Weight: weight each, total weight, or pure-metal weight (ASW/AGW); then known coins; then the item name
    const unitHint = col(r, "unit") || "";
    let w: { weight: number; unit: Unit } | null = null;
    let fine = false;
    if (col(r, "fineWeight")) { w = parseWeight(col(r, "fineWeight"), unitHint || fieldUnit("fineWeight")); fine = !!w; }
    if (!w && col(r, "weight")) w = parseWeight(col(r, "weight"), unitHint || fieldUnit("weight"));
    if (!w && col(r, "totalWeight")) {
      const tw = parseWeight(col(r, "totalWeight"), unitHint || fieldUnit("totalWeight"));
      if (tw) w = { weight: tw.weight / qty, unit: tw.unit };
    }
    const face = (item + " " + col(r, "weight")).match(/\$\s*(\d+(\.\d+)?)\s*(fv|face)/i);
    if (!w && face && metal === "XAG") { w = { weight: (+face[1] * FACE_FINE_OZ_PER_DOLLAR) / qty, unit: "ozt" }; fine = true; }
    if (!w && known) w = { weight: known.weight, unit: known.unit };
    if (!w) {
      const inItem = item.match(/(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d*\.?\d+)\s*-?\s*(troy\s*)?(ozt|oz|ounces?|grams?|g\b|gr\b|kilos?|kg|lbs?|pounds?)\b/i);
      if (inItem) w = parseWeight(inItem[0]);
    }
    if (!w) {
      const c = spare.find((x) => /^\s*(\d+\s*\/\s*\d+|\d*\.?\d+)\s*-?\s*(troy\s*)?(ozt|oz|ounces?|grams?|g|gr|kilos?|kg|lbs?|pounds?)\.?\s*$/i.test(x));
      if (c) w = parseWeight(c);
    }
    if (!w) problems.push("Missing weight, like 1 oz or 31.1 g.");

    // Purity: its own column, a known coin, the item name, then a sensible default for the metal
    let purCell = col(r, "purity");
    if (/karat|carat|^k$|^kt$/i.test(header[at("purity")] ?? "") && /^\d{1,2}$/.test(purCell)) purCell += "k";
    let pur = fine ? { purity: 1, grade: "Pure weight given" } : purCell ? parsePurity(purCell) : null;
    if (purCell && !pur && !fine) problems.push(`Couldn't read the purity "${purCell}".`);
    // "1 oz Krugerrand" / "1/10 oz Gold Eagle" name the gold inside, not the coin's weight: use the coin's real specs
    if (!fine && known && known.purity < 0.99 && w && (!metal || known.metal === metal)) {
      const givenOzt = w.weight * ({ ozt: 1, g: 1 / 31.1034768, kg: 1000 / 31.1034768, dwt: 0.05, oz: 28.349523125 / 31.1034768 }[w.unit]);
      const knownFine = known.weight * (known.unit === "g" ? 1 / 31.1034768 : 1) * known.purity;
      if (Math.abs(givenOzt - knownFine) / knownFine < 0.03) { w = { weight: known.weight, unit: known.unit }; pur = { purity: known.purity, grade: known.grade }; }
    }
    if (!pur && known && (!metal || known.metal === metal)) pur = { purity: known.purity, grade: known.grade };
    if (!pur) pur = parsePurity(item.match(/\d{1,2}\s*(k|kt|karat)\b|\.9{2,4}\d?|\b9{3,4}\b|sterling|junk|90\s*%|40\s*%|35\s*%/i)?.[0] ?? "");
    if (!pur && metal) pur = { purity: metal === "XPT" || metal === "XPD" || metal === "XRH" ? 0.9995 : 0.999, grade: null };
    if (pur && metal && !pur.grade) pur.grade = GRADES[metal].find((g) => Math.abs(g[1] - pur!.purity) < 1e-6)?.[0] ?? null;

    const dateCell = col(r, "date");
    const date = dateCell ? parseDate(dateCell, order) : null;
    if (dateCell && !date) problems.push(`Couldn't read the date "${dateCell}". Use a format like 2024-03-15 or 3/15/2024.`);
    if (date && date > today) problems.push("Date is in the future.");

    let paid = col(r, "paid") ? parseMoney(col(r, "paid")) : null;
    const each = col(r, "unitPrice") ? parseMoney(col(r, "unitPrice")) : null;
    if (paid == null && each != null) paid = Math.round(each * qty * 100) / 100;
    if (col(r, "paid") && paid == null) problems.push(`Couldn't read the price "${col(r, "paid")}".`);
    if (paid != null && paid < 0) return { line, raw: r, problems: [], purchase: null, skipped: "Negative amount, looks like a sale" };

    const ok = metal && w && pur && problems.length === 0;
    return {
      line, raw: r, problems,
      purchase: ok ? {
        metal: metal!, description: item || null, qty, weight: Math.round(w!.weight * 1e6) / 1e6, unit: w!.unit,
        purity: pur!.purity, grade: pur!.grade, bought_now: !date, bought_on: date, paid,
      } : null,
    };
  });
}

// ---------- Export ----------
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(purchases: Purchase[], spotNow: Partial<Record<Metal, number>>): string {
  const head = ["Date bought", "Item", "Metal", "Quantity", "Weight each", "Unit", "Purity", "Pure troy oz",
    "Total paid", "Paid at spot?", "Spot when bought (per ozt)", "Melt value when bought", "Premium over melt ($)",
    "Premium over melt (%)", "Spot now (per ozt)", "Melt value now"];
  const lines = purchases.map((p) => {
    const oz = fineOz(p), then = p.spot_then != null ? Number(p.spot_then) : null, paid = p.paid != null ? Number(p.paid) : null;
    const meltThen = then != null ? oz * then : null, now = spotNow[p.metal];
    const prem = paid != null && meltThen != null && !p.paid_from_spot ? paid - meltThen : null;
    return [p.bought_on ?? p.created_at.slice(0, 10), p.description ?? "", METALS[p.metal].name, Number(p.qty), Number(p.weight), p.unit,
      Number(p.purity), oz.toFixed(4), paid?.toFixed(2) ?? "", p.paid_from_spot ? "yes" : "no", then?.toFixed(4) ?? "",
      meltThen?.toFixed(2) ?? "", prem?.toFixed(2) ?? "", prem != null && meltThen ? ((prem / meltThen) * 100).toFixed(1) : "",
      now?.toFixed(4) ?? "", now != null ? (oz * now).toFixed(2) : ""].map(cell).join(",");
  });
  return [head.map(cell).join(","), ...lines].join("\n");
}

export const TEMPLATE_CSV = `Date bought,Item,Quantity,Weight each,Purity,Total paid
2023-05-12,American Silver Eagle,20,1 oz,.999,$640.00
3/2/2024,90% junk silver dimes ($10 face),1,8.04 oz,90%,$215
2024-11-08,1/10 oz Gold Eagle,2,1/10 oz,22k,$560
2025-01-20,10 oz silver bar,1,10 oz,.999,$315.50
`;
