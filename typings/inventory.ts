export type SaleChannel = "reseller" | "direct";

/** Who is signed in: the owners, or a seller who records sales without seeing money figures. */
export type Role = "admin" | "seller";

export interface Partner {
  id: string;
  name: string;
  capitalAed: number;
}

export interface Expense {
  id: string;
  label: string;
  amountAed: number;
}

export interface BatchItem {
  id: string;
  brand: string;
  name: string;
  /** Selling price to the end customer, PHP */
  retailPhp: number;
  /** Purchase cost per bottle, AED */
  costAed: number;
  /** Bottles bought in this batch */
  qty: number;
}

export interface Sale {
  id: string;
  itemId: string;
  qty: number;
  /** What the business actually received per bottle, PHP */
  unitPricePhp: number;
  channel: SaleChannel;
  /** ISO date, yyyy-mm-dd */
  date: string;
  note?: string;
  /** Who recorded it. A seller may only change their own; absent means the owners'. */
  soldBy?: Role;
}

export interface Batch {
  id: string;
  name: string;
  /** ISO date, yyyy-mm-dd */
  purchasedOn: string;
  /** 1 AED = rate PHP */
  rateAedToPhp: number;
  /** Reseller commission per bottle, PHP */
  commissionPhp: number;
  partners: Partner[];
  expenses: Expense[];
  items: BatchItem[];
  sales: Sale[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryState {
  version: 1;
  batches: Batch[];
}
