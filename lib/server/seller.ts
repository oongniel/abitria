import type { Batch, InventoryState, Sale } from "@/typings/inventory";

/**
 * What a seller's browser is allowed to receive. Costs, capital, expenses and
 * batch notes never leave the server for them, so no profit figure can be
 * reconstructed client-side — the UI hiding them is the second line, not the first.
 */
export const redactForSeller = (state: InventoryState): InventoryState => ({
  version: 1,
  batches: state.batches.map((b) => ({
    ...b,
    partners: [],
    expenses: [],
    notes: undefined,
    items: b.items.map((i) => ({ ...i, costAed: 0 })),
  })),
});

const isOwn = (s: Sale) => s.soldBy === "seller";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const sameSale = (a: Sale, b: Sale) =>
  a.itemId === b.itemId && a.qty === b.qty && a.unitPricePhp === b.unitPricePhp && a.channel === b.channel && a.date === b.date && (a.note ?? "") === (b.note ?? "");

export type MergeResult = { ok: true; batch: Batch } | { ok: false; message: string };

/**
 * Applies a seller's sales list to the stored batch. Everything else — prices,
 * costs, stock, settings — is taken from the server's copy, so a tampered payload
 * can only ever move sales the seller owns.
 */
export const mergeSellerSales = (current: Batch, incoming: Sale[]): MergeResult => {
  if (!Array.isArray(incoming)) return { ok: false, message: "Sales payload is malformed." };

  const mine = new Map(current.sales.filter(isOwn).map((s) => [s.id, s]));
  const theirs = current.sales.filter((s) => !isOwn(s));
  const kept = new Map(theirs.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const next: Sale[] = [];

  for (const s of incoming) {
    if (!s || typeof s.id !== "string" || !s.id) return { ok: false, message: "Sales payload is malformed." };
    if (seen.has(s.id)) return { ok: false, message: "That sale is listed twice." };
    seen.add(s.id);

    // The owners' sales pass through untouched; a seller may not edit or delete them.
    const locked = kept.get(s.id);
    if (locked) {
      if (!sameSale(locked, s)) return { ok: false, message: "Only the owner can change that sale." };
      next.push(locked);
      continue;
    }
    // Anything else is the seller's own — existing or newly recorded.
    if (!current.items.some((i) => i.id === s.itemId)) return { ok: false, message: "That perfume isn’t in this batch." };
    if (!Number.isInteger(s.qty) || s.qty < 1) return { ok: false, message: "Bottles sold must be a whole number, at least 1." };
    if (!Number.isFinite(s.unitPricePhp) || s.unitPricePhp < 0) return { ok: false, message: "The price received must be zero or more." };
    if (s.channel !== "reseller" && s.channel !== "direct") return { ok: false, message: "A sale is either through a reseller or direct." };
    if (typeof s.date !== "string" || !ISO_DATE.test(s.date)) return { ok: false, message: "That sale date isn’t a valid date." };
    if (s.note !== undefined && (typeof s.note !== "string" || s.note.length > 500)) return { ok: false, message: "That note is too long." };
    next.push({ id: s.id, itemId: s.itemId, qty: s.qty, unitPricePhp: s.unitPricePhp, channel: s.channel, date: s.date, note: s.note?.trim() || undefined, soldBy: "seller" });
  }

  // Dropping one of the owners' sales is a deletion by omission.
  if (theirs.some((s) => !seen.has(s.id))) return { ok: false, message: "Only the owner can delete that sale." };
  // A seller may reuse an id only for a sale that is already theirs.
  for (const s of next) if (s.soldBy === "seller" && !mine.has(s.id) && current.sales.some((o) => o.id === s.id)) return { ok: false, message: "That sale already exists." };

  for (const item of current.items) {
    const sold = next.filter((s) => s.itemId === item.id).reduce((n, s) => n + s.qty, 0);
    if (sold > item.qty) return { ok: false, message: `That records ${sold} bottles of ${item.name}, but the batch only has ${item.qty}.` };
  }

  return { ok: true, batch: { ...current, sales: next } };
};
