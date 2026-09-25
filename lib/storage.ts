import type { InventoryState } from "@/typings/inventory";

/**
 * Persistence adapter. localStorage for the POC — swap `load`/`save` for
 * Firestore (or any API) later; nothing else in the app touches storage.
 */
export const STORAGE_KEY = "sillage:v1";

export const emptyState = (): InventoryState => ({ version: 1, batches: [] });

export const isInventoryState = (v: unknown): v is InventoryState =>
  typeof v === "object" &&
  v !== null &&
  (v as InventoryState).version === 1 &&
  Array.isArray((v as InventoryState).batches);

/** First open on this device — nothing has ever been saved (a cleared store still counts as saved). */
export const isFirstRun = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
};

export const load = (): InventoryState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    return isInventoryState(parsed) ? parsed : emptyState();
  } catch {
    return emptyState();
  }
};

export const save = (state: InventoryState): boolean => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
