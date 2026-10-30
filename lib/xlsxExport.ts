// Excel export: a Summary sheet (value, gain/loss, spot at export, per-metal totals)
// and a Purchases sheet with every purchase in organized columns.
import { METALS, METAL_KEYS, fineOz, type Metal, type Purchase } from "./metals";
import { SITE_NAME, SITE_URL } from "./site";

type Spot = { price: number; quoted_at: string } | undefined;
type Cell = { value?: string | number | Date | null; type?: StringConstructor | NumberConstructor | DateConstructor; format?: string;
  fontWeight?: "bold"; fontSize?: number; textColor?: string; backgroundColor?: string; align?: "left" | "center" | "right";
  borderColor?: string; borderStyle?: "thin"; bottomBorderColor?: string; bottomBorderStyle?: "thin" | "medium"; topBorderColor?: string; topBorderStyle?: "thin" | "medium";
  columnSpan?: number; wrap?: boolean; fontStyle?: "italic"; height?: number } | null;

const MONEY = "$#,##0.00";
const cents = (n: number) => Math.round(n * 100) / 100;
const SPOT = "$#,##0.00##";
const OZ = "#,##0.0000";
const PCT = "+0.0%;-0.0%;0.0%";
const DATE = "mmm d, yyyy";
const HEAD_BG = "#1F5F8B", HEAD_FG = "#FFFFFF", BAND = "#EEF1F4", LINE = "#CFD7E0", MUTED = "#5B6878";

const head = (v: string, align: "left" | "right" = "left"): Cell =>
  ({ value: v, fontWeight: "bold", textColor: HEAD_FG, backgroundColor: HEAD_BG, align, wrap: true });
const num = (v: number | null | undefined, format: string, extra: Partial<NonNullable<Cell>> = {}): Cell =>
  v == null || !Number.isFinite(v) ? { value: null, ...extra } : { value: v, type: Number, format, ...extra };
const txt = (v: string | null | undefined, extra: Partial<NonNullable<Cell>> = {}): Cell => ({ value: v ?? "", type: String, ...extra });
const day = (s: string | null | undefined): Cell => {
  if (!s) return { value: null };
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return { value: new Date(Date.UTC(y, m - 1, d)), type: Date, format: DATE };
};
// "Bought just now" purchases: the day in the viewer's own time zone, not UTC
const localDay = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export async function exportXlsx(purchases: Purchase[], spot: Partial<Record<Metal, Spot>>) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const now = new Date();
  const quoted = Object.values(spot).map((s) => s?.quoted_at).filter(Boolean).sort().pop();

  // ---- Purchases sheet ----
  const pHead = ["Date bought", "Item", "Metal", "Quantity", "Weight each", "Unit", "Purity", "Pure troy oz",
    "Total paid", "Price source", "Spot when bought ($/ozt)", "Melt value when bought", "Premium over melt",
    "Premium %", "Spot now ($/ozt)", "Melt value now", "Gain / loss", "Gain / loss %"];
  const rightCols = new Set([3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17]);
  const sorted = [...purchases].sort((a, b) => (b.bought_on ?? localDay(b.created_at)).localeCompare(a.bought_on ?? localDay(a.created_at)));
  let sumPaid = 0, sumNow = 0, sumThen = 0;
  const rows = sorted.map((p, i) => {
    const oz = fineOz(p);
    const then = p.spot_then != null ? Number(p.spot_then) : null;
    const paid = p.paid != null ? Number(p.paid) : null;
    const meltThen = then != null ? cents(oz * then) : null;
    const nowP = spot[p.metal]?.price;
    const meltNow = nowP != null ? cents(oz * nowP) : null;
    const prem = paid != null && meltThen != null && !p.paid_from_spot ? paid - meltThen : null;
    const gain = paid != null && meltNow != null ? cents(meltNow - paid) : null;
    sumPaid += paid ?? 0; sumNow += meltNow ?? 0; sumThen += meltThen ?? 0;
    const bg = i % 2 ? BAND : undefined;
    const b = { backgroundColor: bg };
    return [
      { ...day(p.bought_on ?? localDay(p.created_at)), ...b },
      txt(p.description, b), txt(METALS[p.metal].name, b),
      num(Number(p.qty), "#,##0.####", b), num(Number(p.weight), "#,##0.####", b), txt(p.unit === "ozt" ? "troy oz" : p.unit === "oz" ? "oz (avdp)" : p.unit, b),
      num(Number(p.purity), "0.0###", b), num(oz, OZ, b),
      num(paid, MONEY, b), txt(paid == null ? "" : p.paid_from_spot ? "Spot that day" : "You entered", b),
      num(then, SPOT, b), num(meltThen, MONEY, b), num(prem, MONEY, b),
      num(prem != null && meltThen ? prem / meltThen : null, PCT, b),
      num(nowP, SPOT, b), num(meltNow, MONEY, b),
      num(gain, MONEY, { ...b, textColor: gain == null ? undefined : gain >= 0 ? "#1D7A4C" : "#B23A3A" }),
      num(gain != null && paid ? gain / paid : null, PCT, { ...b, textColor: gain == null ? undefined : gain >= 0 ? "#1D7A4C" : "#B23A3A" }),
    ] as Cell[];
  });
  const totalTop = { topBorderColor: "#17202B", topBorderStyle: "medium" as const, fontWeight: "bold" as const };
  const totalRow: Cell[] = pHead.map((_, i) =>
    i === 0 ? { value: "Total", ...totalTop }
      : i === 8 ? num(sumPaid, MONEY, totalTop)
      : i === 11 ? num(sumThen, MONEY, totalTop)
      : i === 15 ? num(sumNow, MONEY, totalTop)
      : i === 16 ? num(sumNow - sumPaid, MONEY, totalTop)
      : i === 17 ? num(sumPaid ? (sumNow - sumPaid) / sumPaid : null, PCT, totalTop)
      : { value: null, ...totalTop });
  const purchasesSheet = {
    sheet: "Purchases",
    stickyRowsCount: 1,
    columns: [13, 34, 11, 10, 12, 11, 9, 13, 14, 15, 15, 15, 15, 11, 15, 15, 14, 12].map((width) => ({ width })),
    data: [pHead.map((h, i) => head(h, rightCols.has(i) ? "right" : "left")), ...rows, totalRow],
  };

  // ---- Summary sheet ----
  const by = Object.fromEntries(METAL_KEYS.map((k) => [k, { oz: 0, val: 0, paid: 0, n: 0 }])) as Record<Metal, { oz: number; val: number; paid: number; n: number }>;
  for (const p of purchases) {
    const oz = fineOz(p), s = spot[p.metal]?.price ?? 0;
    by[p.metal].oz += oz; by[p.metal].val += cents(oz * s); by[p.metal].paid += Number(p.paid ?? 0); by[p.metal].n++;
  }
  const total = METAL_KEYS.reduce((t, k) => t + by[k].val, 0);
  const cost = METAL_KEYS.reduce((t, k) => t + by[k].paid, 0);
  const gain = cents(total - cost);
  const label = (v: string): Cell => ({ value: v, textColor: MUTED });
  const big = (v: number | null, format: string, color?: string): Cell => num(v, format, { fontWeight: "bold", fontSize: 14, textColor: color, align: "right" });
  const sHead = ["Metal", "Purchases", "Pure troy oz", "Pure grams", "Spot now ($/ozt)", "Melt value now", "Total paid", "Gain / loss", "Gain / loss %", "Share of stack"];
  const metalRows = METAL_KEYS.filter((k) => by[k].n > 0).map((k, i) => {
    const m = by[k], g = cents(m.val - m.paid), b = { backgroundColor: i % 2 ? BAND : undefined };
    const color = g >= 0 ? "#1D7A4C" : "#B23A3A";
    return [txt(METALS[k].name, { ...b, fontWeight: "bold" }), num(m.n, "0", b), num(m.oz, OZ, b), num(m.oz * 31.1034768, "#,##0.00", b),
      num(spot[k]?.price, SPOT, b), num(m.val, MONEY, b), num(m.paid, MONEY, b), num(g, MONEY, { ...b, textColor: color }),
      num(m.paid ? g / m.paid : null, PCT, { ...b, textColor: color }), num(total ? m.val / total : null, "0.0%", b)] as Cell[];
  });
  const spotRows = METAL_KEYS.map((k) => [txt(METALS[k].name), num(spot[k]?.price, SPOT, { align: "right" }),
    txt(spot[k]?.quoted_at ? when(new Date(spot[k]!.quoted_at)) : "", { textColor: MUTED })] as Cell[]);
  const blank: Cell[] = [];
  const gainColor = gain >= 0 ? "#1D7A4C" : "#B23A3A";
  const summarySheet = {
    sheet: "Summary",
    showGridLines: false,
    columns: [22, 13, 15, 14, 16, 16, 15, 15, 14, 14].map((width) => ({ width })),
    data: [
      [{ value: `${SITE_NAME}: your stack`, fontWeight: "bold", fontSize: 18, columnSpan: 6, height: 30 }],
      [{ value: `Exported ${when(now)}${quoted ? ` · spot prices as of ${when(new Date(quoted))}` : ""}`, textColor: MUTED, columnSpan: 8 }],
      blank,
      [label("Melt value now"), null, big(total, MONEY)],
      [label("Total paid"), null, big(cost, MONEY)],
      [label("Gain / loss"), null, big(cost ? gain : null, MONEY, gainColor), num(cost ? gain / cost : null, PCT, { fontWeight: "bold", textColor: gainColor })],
      [label("Purchases"), null, num(purchases.length, "0", { align: "right" })],
      blank,
      [{ value: "By metal", fontWeight: "bold", fontSize: 13 }],
      sHead.map((h, i) => head(h, i === 0 ? "left" : "right")),
      ...metalRows,
      [txt("Total", totalTop), num(purchases.length, "0", totalTop), { value: null, ...totalTop }, { value: null, ...totalTop }, { value: null, ...totalTop },
        num(total, MONEY, totalTop), num(cost, MONEY, totalTop), num(gain, MONEY, { ...totalTop, textColor: gainColor }),
        num(cost ? gain / cost : null, PCT, { ...totalTop, textColor: gainColor }), num(total ? 1 : null, "0.0%", totalTop)],
      blank,
      [{ value: "Spot prices at export", fontWeight: "bold", fontSize: 13 }],
      [head("Metal"), head("Spot ($/ozt)", "right"), { ...head("Quoted at"), columnSpan: 3 }],
      ...spotRows,
      blank,
      [{ value: "Melt value = pure metal weight × spot price. Dealers usually buy back somewhat below spot. Purchases logged without a price count at the spot price on the day bought.", textColor: MUTED, fontStyle: "italic", columnSpan: 10, wrap: true, height: 32 }],
      [{ value: SITE_URL, textColor: MUTED, columnSpan: 4 }],
    ] as Cell[][],
  };

  const name = `track-my-stack-${now.toISOString().slice(0, 10)}.xlsx`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeXlsxFile([summarySheet, purchasesSheet] as any, { fontFamily: "Calibri", fontSize: 11 }).toFile(name);
}
