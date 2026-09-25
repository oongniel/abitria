import { createHash } from "node:crypto";

import { batchFigures } from "@/lib/calc";
import { uid } from "@/lib/id";
import type { Batch, InventoryState, SaleChannel } from "@/typings/inventory";

/**
 * How the inventory is laid out in the spreadsheet. One tab per record type,
 * matched by header name (column order doesn't matter). "Summary" is written
 * by the app for reading in Sheets and is never read back.
 */
export const TABS = {
  batches: { title: "Batches", headers: ["id", "name", "purchasedOn", "rateAedToPhp", "commissionPhp", "notes", "createdAt", "updatedAt"] },
  partners: { title: "Partners", headers: ["id", "batchId", "batchName", "name", "capitalAed"] },
  expenses: { title: "Expenses", headers: ["id", "batchId", "batchName", "label", "amountAed"] },
  items: { title: "Items", headers: ["id", "batchId", "batchName", "brand", "name", "retailPhp", "costAed", "qty"] },
  sales: { title: "Sales", headers: ["id", "batchId", "batchName", "itemId", "perfume", "date", "qty", "unitPricePhp", "channel", "note"] },
} as const;

export const SUMMARY = {
  title: "Summary",
  headers: ["Batch", "Bought", "Bottles", "Sold", "Left", "Cost (AED)", "Revenue (PHP)", "Revenue (AED)", "Profit so far (AED)", "Profit if all sells (AED)"],
};

export type TabKey = keyof typeof TABS;
export type Cell = string | number | boolean | null | undefined;
export type Grid = Cell[][];
export type TabGrids = Record<TabKey, Grid>;

/* ---------- cell helpers ---------- */

const str = (v: Cell): string => (v === null || v === undefined ? "" : String(v).trim());
const opt = (v: Cell): string | undefined => str(v) || undefined;
const num = (v: Cell, fallback = 0): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(str(v).replace(/[,₱]/g, "").replace(/aed/i, ""));
  return str(v) !== "" && Number.isFinite(n) ? n : fallback;
};
/** Dates typed in Sheets come back as serial numbers — convert to yyyy-mm-dd. */
const isoDate = (v: Cell): string => {
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86_400_000)).toISOString().slice(0, 10);
  const s = str(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
};

type Row = Record<string, Cell>;

/** Turns a tab's grid into objects keyed by (case-insensitive) header name. */
const records = (grid: Grid): Row[] => {
  const [head, ...rows] = grid;
  if (!head) return [];
  const keys = head.map((h) => str(h).toLowerCase());
  return rows
    .filter((r) => r.some((c) => str(c) !== ""))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]])) as Row);
};
const get = (r: Row, key: string) => r[key.toLowerCase()];

/* ---------- sheet → app ---------- */

export interface ReadResult {
  state: InventoryState;
  /** Rows the owner added by hand without an id — the next write assigns one. */
  repaired: boolean;
}

export const gridsToState = (grids: TabGrids): ReadResult => {
  let repaired = false;
  const idOf = (r: Row, prefix: string) => {
    const id = str(get(r, "id"));
    if (id) return id;
    repaired = true;
    return uid(prefix);
  };

  const batches: Batch[] = records(grids.batches).map((r) => ({
    id: idOf(r, "b_"),
    name: str(get(r, "name")) || "Untitled batch",
    purchasedOn: isoDate(get(r, "purchasedOn")),
    rateAedToPhp: num(get(r, "rateAedToPhp"), 17),
    commissionPhp: num(get(r, "commissionPhp"), 0),
    notes: opt(get(r, "notes")),
    createdAt: str(get(r, "createdAt")) || new Date(0).toISOString(),
    updatedAt: str(get(r, "updatedAt")) || new Date(0).toISOString(),
    partners: [],
    expenses: [],
    items: [],
    sales: [],
  }));

  // Child rows point at a batch by id; a hand-added row may use the batch name instead.
  const byId = new Map(batches.map((b) => [b.id, b]));
  const byName = new Map(batches.map((b) => [b.name.toLowerCase(), b]));
  const owner = (r: Row) => byId.get(str(get(r, "batchId"))) ?? byName.get(str(get(r, "batchName")).toLowerCase());

  for (const r of records(grids.partners)) owner(r)?.partners.push({ id: idOf(r, "p_"), name: str(get(r, "name")), capitalAed: num(get(r, "capitalAed")) });
  for (const r of records(grids.expenses)) owner(r)?.expenses.push({ id: idOf(r, "e_"), label: str(get(r, "label")), amountAed: num(get(r, "amountAed")) });
  for (const r of records(grids.items))
    owner(r)?.items.push({ id: idOf(r, "i_"), brand: str(get(r, "brand")), name: str(get(r, "name")), retailPhp: num(get(r, "retailPhp")), costAed: num(get(r, "costAed")), qty: Math.max(0, Math.round(num(get(r, "qty")))) });
  for (const r of records(grids.sales)) {
    const b = owner(r);
    if (!b) continue;
    // A sale may name its perfume instead of carrying an item id.
    const itemId = str(get(r, "itemId")) || b.items.find((i) => i.name.toLowerCase() === str(get(r, "perfume")).toLowerCase())?.id;
    if (!itemId) continue;
    const channel: SaleChannel = str(get(r, "channel")).toLowerCase() === "direct" ? "direct" : "reseller";
    b.sales.push({ id: idOf(r, "s_"), itemId, date: isoDate(get(r, "date")), qty: Math.max(1, Math.round(num(get(r, "qty"), 1))), unitPricePhp: num(get(r, "unitPricePhp")), channel, note: opt(get(r, "note")) });
  }

  return { state: { version: 1, batches }, repaired };
};

/* ---------- app → sheet ---------- */

export const stateToGrids = (state: InventoryState): TabGrids => {
  const g: TabGrids = {
    batches: [[...TABS.batches.headers]],
    partners: [[...TABS.partners.headers]],
    expenses: [[...TABS.expenses.headers]],
    items: [[...TABS.items.headers]],
    sales: [[...TABS.sales.headers]],
  };
  for (const b of state.batches) {
    g.batches.push([b.id, b.name, b.purchasedOn, b.rateAedToPhp, b.commissionPhp, b.notes ?? "", b.createdAt, b.updatedAt]);
    b.partners.forEach((p) => g.partners.push([p.id, b.id, b.name, p.name, p.capitalAed]));
    b.expenses.forEach((e) => g.expenses.push([e.id, b.id, b.name, e.label, e.amountAed]));
    b.items.forEach((i) => g.items.push([i.id, b.id, b.name, i.brand, i.name, i.retailPhp, i.costAed, i.qty]));
    b.sales.forEach((s) =>
      g.sales.push([s.id, b.id, b.name, s.itemId, b.items.find((i) => i.id === s.itemId)?.name ?? "", s.date, s.qty, s.unitPricePhp, s.channel, s.note ?? ""]),
    );
  }
  return g;
};

export const summaryGrid = (state: InventoryState): Grid => [
  [...SUMMARY.headers],
  ...state.batches.map((b) => {
    const f = batchFigures(b);
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return [b.name, b.purchasedOn, f.units, f.sold, f.left, r2(f.totalCostAed), r2(f.revenuePhp), r2(f.revenueAed), r2(f.realizedProfitAed), r2(f.projectedProfitAed)];
  }),
];

/**
 * A batch's version is a hash of its content as stored in the sheet.
 * Any edit — from the app or by hand in Sheets — changes it, which is how
 * the server spots that a save would overwrite someone else's change.
 */
export const batchVersion = (b: Batch): string =>
  createHash("sha256")
    .update(JSON.stringify([b.id, b.name, b.purchasedOn, b.rateAedToPhp, b.commissionPhp, b.notes ?? "", b.createdAt, b.updatedAt, b.partners, b.expenses, b.items, b.sales.map((s) => ({ ...s, note: s.note ?? "" }))]))
    .digest("hex")
    .slice(0, 16);

export const versionsOf = (state: InventoryState): Record<string, string> =>
  Object.fromEntries(state.batches.map((b) => [b.id, batchVersion(b)]));
