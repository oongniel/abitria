import { uid, todayIso } from "@/lib/id";
import type { Batch, BatchItem, Expense, Partner, Sale } from "@/typings/inventory";

const touch = (b: Batch): Batch => ({ ...b, updatedAt: new Date().toISOString() });

export const DEFAULTS = { rateAedToPhp: 17, commissionPhp: 300 };

export const newBatch = (input: {
  name: string;
  purchasedOn?: string;
  rateAedToPhp?: number;
  commissionPhp?: number;
  partners?: Omit<Partner, "id">[];
  expenses?: Omit<Expense, "id">[];
  items?: Omit<BatchItem, "id">[];
  notes?: string;
}): Batch => {
  const now = new Date().toISOString();
  return {
    id: uid("b_"),
    name: input.name.trim() || "Untitled batch",
    purchasedOn: input.purchasedOn ?? todayIso(),
    rateAedToPhp: input.rateAedToPhp ?? DEFAULTS.rateAedToPhp,
    commissionPhp: input.commissionPhp ?? DEFAULTS.commissionPhp,
    partners: (input.partners ?? []).map((p) => ({ ...p, id: uid("p_") })),
    expenses: (input.expenses ?? []).map((e) => ({ ...e, id: uid("e_") })),
    items: (input.items ?? []).map((i) => ({ ...i, id: uid("i_") })),
    sales: [],
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateSettings = (
  b: Batch,
  patch: Partial<Pick<Batch, "name" | "purchasedOn" | "rateAedToPhp" | "commissionPhp" | "notes" | "partners" | "expenses">>,
): Batch => touch({ ...b, ...patch });

export const addItem = (b: Batch, item: Omit<BatchItem, "id">): Batch =>
  touch({ ...b, items: [...b.items, { ...item, id: uid("i_") }] });

export const updateItem = (b: Batch, id: string, patch: Partial<Omit<BatchItem, "id">>): Batch =>
  touch({ ...b, items: b.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

/** Removes the item and every sale recorded against it. */
export const removeItem = (b: Batch, id: string): Batch =>
  touch({ ...b, items: b.items.filter((i) => i.id !== id), sales: b.sales.filter((s) => s.itemId !== id) });

export const recordSale = (b: Batch, sale: Omit<Sale, "id">): Batch =>
  touch({ ...b, sales: [{ ...sale, id: uid("s_") }, ...b.sales] });

export const updateSale = (b: Batch, id: string, patch: Omit<Sale, "id" | "soldBy">): Batch =>
  touch({ ...b, sales: b.sales.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

export const removeSale = (b: Batch, id: string): Batch =>
  touch({ ...b, sales: b.sales.filter((s) => s.id !== id) });

/** New batch pre-filled with the same perfumes, costs and partners — for restocking. */
export const restockFrom = (b: Batch, name: string): Batch =>
  newBatch({
    name,
    rateAedToPhp: b.rateAedToPhp,
    commissionPhp: b.commissionPhp,
    partners: b.partners.map(({ name: n, capitalAed }) => ({ name: n, capitalAed })),
    items: b.items.map(({ brand, name: n, retailPhp, costAed, qty }) => ({ brand, name: n, retailPhp, costAed, qty })),
  });
