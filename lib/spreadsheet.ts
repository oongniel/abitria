import * as XLSX from "xlsx";

import { batchFigures, itemFigures } from "@/lib/calc";
import { DEFAULTS } from "@/lib/batch-ops";
import type { Batch, BatchItem, Partner } from "@/typings/inventory";

/* ---------- Import: the owners' "new stock" sheet ---------- */

export interface ParsedSheet {
  name: string;
  rateAedToPhp: number;
  commissionPhp: number;
  items: Omit<BatchItem, "id">[];
  partners: Omit<Partner, "id">[];
  warnings: string[];
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[,₱]/g, "").replace(/aed/i, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const title = (s: string) => s.trim().replace(/\s+/g, " ").replace(/\b\p{Ll}/gu, (c) => c.toUpperCase());

const HEADERS: Record<string, string[]> = {
  brand: ["brand"],
  retail: ["retail price", "retail", "srp", "price"],
  net: ["less com", "less comm", "less commission", "net"],
  name: ["perfume name", "perfume", "name", "item"],
  cost: ["cost", "cost aed"],
  costPh: ["cost ph", "cost php"],
  qty: ["stock", "qty", "quantity"],
};

export const parseWorkbook = (data: ArrayBuffer, fileName = "Imported batch"): ParsedSheet => {
  const wb = XLSX.read(data, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("The file has no sheets.");
  const ws = wb.Sheets[sheetName]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, blankrows: true, defval: null });

  const headerIdx = rows.findIndex((r) => {
    const cells = (r ?? []).map(norm);
    return cells.includes("brand") && cells.some((c) => HEADERS.name!.includes(c));
  });
  if (headerIdx === -1) {
    throw new Error("Couldn't find the header row. The sheet needs at least “Brand” and “Perfume Name” columns.");
  }
  const header = (rows[headerIdx] ?? []).map(norm);
  const col = (key: string) => header.findIndex((h) => HEADERS[key]!.includes(h));
  const c = { brand: col("brand"), retail: col("retail"), net: col("net"), name: col("name"), cost: col("cost"), costPh: col("costPh"), qty: col("qty") };
  const warnings: string[] = [];
  if (c.retail < 0) warnings.push("No “retail price” column — retail set to 0.");
  if (c.cost < 0) warnings.push("No “cost” column — cost set to 0.");
  if (c.qty < 0) warnings.push("No “Stock” column — quantity set to 0.");

  const items: Omit<BatchItem, "id">[] = [];
  const commissions: number[] = [];
  const rates: number[] = [];
  let r = headerIdx + 1;
  for (; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const name = String(row[c.name] ?? "").trim();
    const brand = String(row[c.brand] ?? "").trim();
    if (!name && !brand) break;
    const retail = num(row[c.retail]) ?? 0;
    const cost = num(row[c.cost]) ?? 0;
    const net = c.net >= 0 ? num(row[c.net]) : null;
    const costPh = c.costPh >= 0 ? num(row[c.costPh]) : null;
    if (net !== null && retail) commissions.push(retail - net);
    if (costPh !== null && cost) rates.push(costPh / cost);
    items.push({ brand: title(brand), name: title(name), retailPhp: retail, costAed: cost, qty: Math.max(0, Math.round(num(row[c.qty]) ?? 0)) });
  }

  const mode = (xs: number[], fallback: number) => {
    if (!xs.length) return fallback;
    const counts = new Map<number, number>();
    xs.forEach((x) => counts.set(Math.round(x * 100) / 100, (counts.get(Math.round(x * 100) / 100) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  };
  const commissionPhp = mode(commissions, DEFAULTS.commissionPhp);
  const rateAedToPhp = mode(rates, DEFAULTS.rateAedToPhp);
  if (new Set(commissions).size > 1) warnings.push(`Commission differed between rows — using ₱${commissionPhp}.`);

  // Partners: a "capital" label, followed by name / amount pairs below it.
  const partners: Omit<Partner, "id">[] = [];
  for (let i = r; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const capCol = row.findIndex((v) => norm(v) === "capital");
    if (capCol === -1) continue;
    for (let j = i + 1; j < rows.length; j++) {
      const pr = rows[j] ?? [];
      const label = pr[capCol - 1];
      const amount = num(pr[capCol]);
      if (typeof label === "string" && label.trim() && amount !== null) {
        partners.push({ name: title(label), capitalAed: amount });
      } else if (partners.length) break;
    }
    break;
  }

  if (!items.length) throw new Error("The header row was found but no perfume rows under it.");
  return {
    name: title(fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")) || "Imported batch",
    rateAedToPhp,
    commissionPhp,
    items,
    partners,
    warnings,
  };
};

/* ---------- Export: same layout as the owners' sheet, with live formulas ---------- */

const safeSheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Batch";

export const exportBatchWorkbook = (batch: Batch) => {
  const f = batchFigures(batch);
  const rate = batch.rateAedToPhp;
  const com = batch.commissionPhp;
  const head = ["Brand", "retail price", "less com", "Perfume Name", "cost", "cost ph", "Stock", "total value", "sales", "stock value", "Margin%", "Margin value", "Sold", "Left", "Actual sales"];
  const aoa: XLSX.CellObject[][] = [head.map((h) => ({ t: "s", v: h }))];

  batch.items.forEach((it, i) => {
    const r = i + 2;
    const fig = itemFigures(batch, it);
    aoa.push([
      { t: "s", v: it.brand },
      { t: "n", v: it.retailPhp },
      { t: "n", v: fig.netPhp, f: `B${r}-${com}` },
      { t: "s", v: it.name },
      { t: "n", v: it.costAed },
      { t: "n", v: fig.costPhp, f: `E${r}*${rate}` },
      { t: "n", v: it.qty },
      { t: "n", v: fig.lineCostAed, f: `E${r}*G${r}` },
      { t: "n", v: fig.lineSalesPhp, f: `C${r}*G${r}` },
      { t: "n", v: fig.lineCostAed, f: `E${r}*G${r}` },
      { t: "n", v: fig.marginPct, f: `IF(C${r}=0,0,(C${r}-F${r})/C${r})`, z: "0%" },
      { t: "n", v: fig.marginPhp, f: `C${r}-F${r}` },
      { t: "n", v: fig.sold },
      { t: "n", v: fig.left, f: `G${r}-M${r}` },
      { t: "n", v: fig.revenuePhp },
    ]);
  });

  const last = batch.items.length + 1;
  const t = last + 1;
  const blank = (): XLSX.CellObject => ({ t: "z" });
  const row = (cells: Record<number, XLSX.CellObject>) => Array.from({ length: head.length }, (_, i) => cells[i] ?? blank());
  aoa.push(row({ 6: { t: "n", v: f.units, f: `SUM(G2:G${last})` }, 7: { t: "n", v: f.goodsCostAed, f: `SUM(H2:H${last})` }, 8: { t: "n", v: f.projectedSalesPhp, f: `SUM(I2:I${last})` }, 9: { t: "s", v: "total sales" }, 12: { t: "n", v: f.sold, f: `SUM(M2:M${last})` }, 14: { t: "n", v: f.revenuePhp, f: `SUM(O2:O${last})` } }));
  aoa.push(row({ 5: { t: "s", v: "capital" }, 8: { t: "n", v: f.projectedSalesAed, f: `I${t}/${rate}` }, 9: { t: "s", v: "sales in AED" } }));
  const pStart = t + 2;
  batch.partners.forEach((p) => aoa.push(row({ 4: { t: "s", v: p.name }, 5: { t: "n", v: p.capitalAed } })));
  const pEnd = pStart + batch.partners.length - 1;
  const expenseRow = aoa.length + 1;
  aoa.push(row({ 4: { t: "s", v: "total" }, 5: { t: "n", v: f.capitalAed, f: batch.partners.length ? `SUM(F${pStart}:F${pEnd})` : undefined }, 7: { t: "s", v: "expenses" }, 8: { t: "n", v: f.expensesAed } }));
  aoa.push(row({ 8: { t: "n", v: f.projectedProfitAed, f: `I${t + 1}-H${t}-I${expenseRow}` }, 9: { t: "s", v: "net profit" } }));
  const n = Math.max(1, batch.partners.length);
  aoa.push(row({ 8: { t: "n", v: f.projectedProfitAed / n, f: `I${expenseRow + 1}/${n}` }, 9: { t: "s", v: "net profit each (equal split)" } }));

  const ws: XLSX.WorkSheet = {};
  aoa.forEach((r2, ri) =>
    r2.forEach((cell, ci) => {
      if (cell.t === "z") return;
      const clean = { ...cell };
      if (clean.f === undefined) delete clean.f;
      ws[XLSX.utils.encode_cell({ r: ri, c: ci })] = clean;
    }),
  );
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: head.length - 1 } });
  ws["!cols"] = head.map((h, i) => ({ wch: i === 0 || i === 3 ? 20 : Math.max(10, h.length + 2) }));

  const sales = XLSX.utils.aoa_to_sheet([
    ["Date", "Perfume", "Brand", "Qty", "Price each (PHP)", "Total (PHP)", "Channel", "Note"],
    ...batch.sales.map((s) => {
      const it = batch.items.find((i) => i.id === s.itemId);
      return [s.date, it?.name ?? "Removed item", it?.brand ?? "", s.qty, s.unitPricePhp, s.qty * s.unitPricePhp, s.channel, s.note ?? ""];
    }),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(batch.name));
  XLSX.utils.book_append_sheet(wb, sales, "Sales");
  XLSX.writeFile(wb, `${batch.name.replace(/[^\w\- ]+/g, "").trim() || "batch"}.xlsx`);
};
