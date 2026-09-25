import sample from "@/content/sample-batch.json";
import { newBatch } from "@/lib/batch-ops";
import { SUMMARY, TABS, gridsToState, stateToGrids, summaryGrid, versionsOf, type Grid, type TabGrids, type TabKey } from "@/lib/server/sheet-schema";
import { mergeSellerSales } from "@/lib/server/seller";
import { SheetsConfigError, memoryClient, restClient, type SheetsClient } from "@/lib/server/sheets-client";
import type { Batch, InventoryState, Sale } from "@/typings/inventory";

export interface Snapshot {
  state: InventoryState;
  versions: Record<string, string>;
}

export class ConflictError extends Error {
  constructor(public snapshot: Snapshot) {
    super("The sheet changed since you last loaded it.");
  }
}

const KEYS = Object.keys(TABS) as TabKey[];
const TITLES = KEYS.map((k) => TABS[k].title);

/* ---------- client selection ---------- */

let client: SheetsClient | null = null;

export const setClient = (c: SheetsClient | null) => {
  client = c;
  bootstrapped = null;
};

const getClient = (): SheetsClient => {
  if (client) return client;
  if (process.env.GOOGLE_SHEETS_FAKE === "1") return (client = memoryClient());
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !privateKey) {
    throw new SheetsConfigError("Google Sheets isn't configured. Set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.");
  }
  return (client = restClient({ sheetId, email, privateKey }));
};

/* ---------- one write at a time per server instance ---------- */

let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
};

/* ---------- bootstrap: create missing tabs, seed the default batch on a brand-new sheet ---------- */

let bootstrapped: Promise<void> | null = null;

const bootstrap = (c: SheetsClient) =>
  (bootstrapped ??= (async () => {
    const existing = new Set(await c.listTabs());
    const missing = [...TITLES, SUMMARY.title].filter((t) => !existing.has(t));
    await c.addTabs(missing);
    if (!existing.has(TABS.batches.title)) {
      await persist(c, { version: 1, batches: [newBatch(sample)] }, {});
    }
  })().catch((e) => {
    bootstrapped = null;
    throw e;
  }));

/* ---------- read / write ---------- */

const readGrids = async (c: SheetsClient) => {
  const raw = await c.read([...TITLES, SUMMARY.title]);
  const grids = Object.fromEntries(KEYS.map((k) => [k, raw[TABS[k].title] ?? []])) as TabGrids;
  const sizes = Object.fromEntries(Object.entries(raw).map(([t, g]) => [t, { rows: g.length, cols: Math.max(0, ...g.map((r) => r.length)) }]));
  return { grids, sizes };
};

/** Pads to the previous size so rows/cells that no longer exist are blanked in the same request. */
const pad = (values: Grid, prev: { rows: number; cols: number } | undefined): Grid => {
  const cols = Math.max(values[0]?.length ?? 0, prev?.cols ?? 0);
  const rows = Math.max(values.length, prev?.rows ?? 0);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, ci) => values[r]?.[ci] ?? ""));
};

const persist = async (c: SheetsClient, state: InventoryState, sizes: Record<string, { rows: number; cols: number }>): Promise<Snapshot> => {
  const grids = stateToGrids(state);
  await c.write([
    ...KEYS.map((k) => ({ title: TABS[k].title, values: pad(grids[k], sizes[TABS[k].title]) })),
    { title: SUMMARY.title, values: pad(summaryGrid(state), sizes[SUMMARY.title]) },
  ]);
  // Normalise through the same path a read takes, so versions match the next read exactly.
  const normalised = gridsToState(grids).state;
  return { state: normalised, versions: versionsOf(normalised) };
};

const load = async (c: SheetsClient) => {
  await bootstrap(c);
  const { grids, sizes } = await readGrids(c);
  const { state, repaired } = gridsToState(grids);
  return { state, sizes, repaired };
};

export const readSnapshot = (): Promise<Snapshot> =>
  serial(async () => {
    const c = getClient();
    const { state, sizes, repaired } = await load(c);
    // Hand-added rows get ids written back so they stay stable.
    if (repaired) return persist(c, state, sizes);
    return { state, versions: versionsOf(state) };
  });

/**
 * Saves one batch. `baseVersion` is the version the client last saw (null for a
 * batch the client believes is new). If the sheet has moved on, nothing is written.
 */
export const saveBatch = (batch: Batch, baseVersion: string | null): Promise<Snapshot> =>
  serial(async () => {
    const c = getClient();
    const { state, sizes } = await load(c);
    const current = versionsOf(state)[batch.id] ?? null;
    if (current !== baseVersion) throw new ConflictError({ state, versions: versionsOf(state) });
    const stamped = { ...batch, updatedAt: new Date().toISOString() };
    const exists = state.batches.some((b) => b.id === batch.id);
    const next: InventoryState = {
      version: 1,
      batches: exists ? state.batches.map((b) => (b.id === batch.id ? stamped : b)) : [stamped, ...state.batches],
    };
    return persist(c, next, sizes);
  });

export class ForbiddenError extends Error {}

/**
 * The seller's only write. Their payload supplies sales and nothing else: the
 * batch is rebuilt from the sheet, so prices, costs and stock can't be touched.
 */
export const saveSellerSales = (id: string, sales: Sale[], baseVersion: string | null): Promise<Snapshot> =>
  serial(async () => {
    const c = getClient();
    const { state, sizes } = await load(c);
    const current = state.batches.find((b) => b.id === id);
    const version = versionsOf(state)[id] ?? null;
    if (!current) throw new ForbiddenError("That batch isn’t in the sheet.");
    if (version !== baseVersion) throw new ConflictError({ state, versions: versionsOf(state) });

    const merged = mergeSellerSales(current, sales);
    if (!merged.ok) throw new ForbiddenError(merged.message);

    const stamped = { ...merged.batch, updatedAt: new Date().toISOString() };
    return persist(c, { version: 1, batches: state.batches.map((b) => (b.id === id ? stamped : b)) }, sizes);
  });

export const deleteBatch = (id: string, baseVersion: string | null): Promise<Snapshot> =>
  serial(async () => {
    const c = getClient();
    const { state, sizes } = await load(c);
    const current = versionsOf(state)[id] ?? null;
    if (current === null) return { state, versions: versionsOf(state) };
    if (current !== baseVersion) throw new ConflictError({ state, versions: versionsOf(state) });
    return persist(c, { version: 1, batches: state.batches.filter((b) => b.id !== id) }, sizes);
  });

/** Restore a backup or clear everything. */
export const replaceState = (state: InventoryState): Promise<Snapshot> =>
  serial(async () => {
    const c = getClient();
    const { sizes } = await load(c);
    return persist(c, state, sizes);
  });
