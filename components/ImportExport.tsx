"use client";

import { useMemo, useState } from "react";
import { FIELD_LABELS, TEMPLATE_CSV, buildRows, cellsToText, findHeaderRow, guessFields, parseCsv, toCsv, type Field } from "@/lib/csv";
import { METALS, METAL_KEYS, fineOz, fmtDay, fmtOz, usd, type Metal, type Purchase } from "@/lib/metals";
import type { PurchaseStore } from "@/lib/store";
import type { Prices } from "./Dashboard";

const MAX_ROWS = 2000;
const FIELDS = Object.keys(FIELD_LABELS) as Field[];

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ImportExport({ purchases, prices, store, onImported }: {
  purchases: Purchase[]; prices: Prices; store: PurchaseStore; onImported: (rows: Purchase[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [sheets, setSheets] = useState<{ name: string; grid: string[][] }[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [detectedHeader, setDetectedHeader] = useState(-1);
  const [hasHeader, setHasHeader] = useState(true);
  const [fields, setFields] = useState<Field[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const headerRow = hasHeader ? detectedHeader : -1;
  const header = headerRow >= 0 ? grid[headerRow] : null;
  const allData = useMemo(() => grid.slice(headerRow + 1), [grid, headerRow]);
  const dataRows = useMemo(() => allData.slice(0, MAX_ROWS), [allData]);
  const cols = Math.max(0, ...grid.slice(0, 30).map((r) => r.length));
  const activeFields = fields ?? [];
  const built = useMemo(() => (fields ? buildRows(dataRows, fields, headerRow + 2, header ?? []) : [])
    .filter((r) => r.skipped !== "Empty row"), [dataRows, fields, headerRow, header]);
  const good = built.filter((r) => r.purchase);
  const skipped = built.filter((r) => r.skipped);
  const bad = built.filter((r) => !r.purchase && !r.skipped);

  function applyGrid(g: string[][]) {
    setGrid(g); setMsg(null);
    const h = findHeaderRow(g);
    setDetectedHeader(h < 0 ? 0 : h);
    setHasHeader(h >= 0);
    const width = Math.max(0, ...g.slice(0, 30).map((r) => r.length));
    const guessed = h >= 0 ? guessFields(g[h]) : [];
    setFields(g.length ? Array.from({ length: width }, (_, i) => guessed[i] ?? "ignore") : null);
  }
  function loadText(t: string) {
    setText(t); setFileName(null); setSheets([]);
    applyGrid(t.trim() ? parseCsv(t) : []);
  }
  function reset() { setText(""); setFileName(null); setSheets([]); setGrid([]); setFields(null); setMsg(null); }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setMsg(null); setText("");
    const name = f.name.toLowerCase();
    if (f.size > 10_000_000) { setMsg({ text: "That file is over 10 MB. Split it into smaller files and import them one at a time.", ok: false }); return; }
    if (/\.(xls|numbers|ods)$/.test(name)) {
      setMsg({ text: "That file type can't be read directly. In your spreadsheet app, use Save As or Export and choose Excel (.xlsx) or CSV, then upload that file.", ok: false });
      return;
    }
    try {
      if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const book = (await readXlsxFile(f)).map((sh) => ({ name: sh.sheet, grid: cellsToText(sh.data as unknown[][]) })).filter((sh) => sh.grid.some((r) => r.some((c) => c)));
        if (!book.length) { setMsg({ text: "That workbook looks empty.", ok: false }); return; }
        // Start on the sheet with the most rows
        const filled = (g: string[][]) => g.filter((r) => r.some((c) => c)).length;
        const biggest = book.reduce((bi, sh, i) => (filled(sh.grid) > filled(book[bi].grid) ? i : bi), 0);
        setSheets(book); setSheetIdx(biggest); setFileName(f.name); applyGrid(book[biggest].grid);
      } else {
        setSheets([]); setFileName(f.name); applyGrid(parseCsv(await f.text()));
      }
    } catch {
      setMsg({ text: "That file couldn't be read. If it's from Excel or Google Sheets, save it as .xlsx or .csv and try again.", ok: false });
    }
  }

  async function runImport() {
    if (!good.length) return;
    setBusy(true); setMsg(null);
    try {
      const rows = await store.addMany(good.map((r) => r.purchase!));
      onImported(rows);
      const pending = rows.filter((r) => r.spot_then == null).length;
      reset();
      setMsg({
        text: `Imported ${rows.length} purchase${rows.length === 1 ? "" : "s"}.` +
          (pending ? ` ${pending} ${pending === 1 ? "has" : "have"} a date with no recorded spot price yet, so "spot when bought" shows as Pending.` : ""),
        ok: true,
      });
    } catch {
      setMsg({ text: "The import didn't go through. Check your connection and try again; nothing was half-saved.", ok: false });
    }
    setBusy(false);
  }

  const spotNow = Object.fromEntries(METAL_KEYS.map((k) => [k, prices[k]?.price])) as Partial<Record<Metal, number>>;

  return (
    <section>
      <div className="sechead">
        <h2>Import &amp; export</h2>
        <span className="small muted">Bring your spreadsheet in, or take your data out anytime</span>
      </div>
      <div className="card">
        <div className="actions">
          <button type="button" className={open ? "" : "primary"} onClick={() => setOpen((o) => !o)}>
            {open ? "Close import" : "Import from a spreadsheet"}
          </button>
          <button type="button" disabled={!purchases.length}
            onClick={() => download(`track-my-stack-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(purchases, spotNow))}>
            Export to CSV
          </button>
          <span className="small muted">Export opens in Excel, Google Sheets or Numbers.</span>
        </div>

        {open && (
          <div style={{ display: "grid", gap: 14 }}>
            <p className="small muted" style={{ margin: 0 }}>
              Upload an Excel (.xlsx) or CSV file, or copy the rows from your spreadsheet and paste them below. Use whatever columns you already
              keep, such as date, item, quantity, weight, purity and price paid. We work out the metal and pure ounces and
              fill in the spot price for each date. Not sure of the format?{" "}
              <button type="button" className="link" style={{ padding: 0, color: "var(--accent)" }} onClick={() => download("track-my-stack-template.csv", TEMPLATE_CSV)}>
                Download a template
              </button>.
            </p>

            <div className="grid">
              <div className="field">
                <label htmlFor="imp-file">Excel or CSV file</label>
                <input id="imp-file" type="file"
                  accept=".xlsx,.xlsm,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
                {fileName && <span className="small muted">{fileName}</span>}
                <span className="small muted">Google Sheets: File, Download, then .xlsx or .csv. Numbers: File, Export To, then Excel or CSV.</span>
                {sheets.length > 1 && (
                  <>
                    <label htmlFor="imp-sheet" style={{ marginTop: 6 }}>Which sheet?</label>
                    <select id="imp-sheet" value={sheetIdx} onChange={(e) => { const i = Number(e.target.value); setSheetIdx(i); applyGrid(sheets[i].grid); }}>
                      {sheets.map((sh, i) => <option key={i} value={i}>{sh.name} ({sh.grid.filter((r) => r.some((c) => c)).length} rows)</option>)}
                    </select>
                  </>
                )}
              </div>
              <div className="field wide">
                <label htmlFor="imp-paste">Or paste from your spreadsheet</label>
                <textarea id="imp-paste" rows={5} className="num" placeholder={"Date,Item,Qty,Weight,Purity,Paid\n2023-05-12,Silver Eagle,20,1 oz,.999,$640"}
                  value={fileName ? "" : text} onChange={(e) => loadText(e.target.value)} />
              </div>
            </div>

            {grid.length > 0 && fields && (
              <>
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="sechead">
                    <strong>Match your columns</strong>
                    <label className="check small" htmlFor="imp-header">
                      <input id="imp-header" type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                      {detectedHeader > 0 ? `Row ${detectedHeader + 1} is column names` : "First row is column names"}
                    </label>
                  </div>
                  <div className="tbl">
                    <table className="map">
                      <thead><tr>{Array.from({ length: cols }, (_, i) => <th key={i}>{header?.[i] || `Column ${i + 1}`}</th>)}</tr></thead>
                      <tbody>
                        <tr>{Array.from({ length: cols }, (_, i) => (
                          <td key={i}>
                            <select aria-label={`What is ${header?.[i] || `column ${i + 1}`}?`} value={activeFields[i] ?? "ignore"}
                              onChange={(e) => setFields((f) => { const n = [...(f ?? [])]; n[i] = e.target.value as Field; return n; })}>
                              {FIELDS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                            </select>
                            <div className="small muted" style={{ marginTop: 4 }}>{dataRows[0]?.[i] || "—"}</div>
                          </td>
                        ))}</tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <strong>
                    {good.length} ready to import{bad.length ? `, ${bad.length} need${bad.length === 1 ? "s" : ""} fixing` : ""}
                    {skipped.length ? `, ${skipped.length} skipped` : ""}
                    {allData.length > MAX_ROWS ? ` (first ${MAX_ROWS} rows only)` : ""}
                  </strong>
                  <div className="tbl" style={{ maxHeight: 360, overflowY: "auto" }}>
                    <table>
                      <thead><tr><th>Row</th><th>Item</th><th>Metal</th><th className="r">Pure oz</th><th>Date</th><th className="r">Paid</th><th>Status</th></tr></thead>
                      <tbody>
                        {built.slice(0, 200).map((r) => (
                          <tr key={r.line}>
                            <td className="num">{r.line}</td>
                            <td>{r.purchase?.description ?? r.raw.join(" · ")}</td>
                            <td>{r.purchase ? METALS[r.purchase.metal].name : "—"}</td>
                            <td className="r num">{r.purchase ? fmtOz(fineOz(r.purchase)) : "—"}</td>
                            <td>{r.purchase ? (r.purchase.bought_on ? fmtDay(r.purchase.bought_on) : "No date: today") : "—"}</td>
                            <td className="r num">{r.purchase ? (r.purchase.paid != null ? usd(r.purchase.paid) : "At spot") : "—"}</td>
                            <td className={r.purchase ? "up small" : r.skipped ? "muted small" : "down small"}>{r.purchase ? "Ready" : r.skipped ? `Skipped: ${r.skipped}` : r.problems.join(" ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {built.length > 200 && <span className="small muted">Showing the first 200 rows. All {built.length} will be checked.</span>}
                  <p className="small muted" style={{ margin: 0 }}>
                    Rows with no price paid are logged at that day&apos;s spot price. Rows with no date are logged as bought today.
                    Rows that need fixing aren&apos;t imported; fix them here by changing a column above, or in your sheet and import those again.
                    Totals rows and sales are skipped automatically.
                  </p>
                  <div className="actions">
                    <button type="button" className="primary" disabled={!good.length || busy} onClick={runImport}>
                      {busy ? "Importing…" : `Import ${good.length} purchase${good.length === 1 ? "" : "s"}`}
                    </button>
                    <button type="button" onClick={reset}>Start over</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {msg && <p className={`msg ${msg.ok ? "ok" : "bad"}`} style={{ margin: 0 }} role="status">{msg.text}</p>}
      </div>
    </section>
  );
}
