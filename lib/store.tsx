"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";

import seed from "@/content/sample-batch.json";
import { newBatch } from "@/lib/batch-ops";
import { remote, type Snapshot } from "@/lib/remote";
import { emptyState, isFirstRun, load, save } from "@/lib/storage";
import type { Batch, InventoryState } from "@/typings/inventory";

/** "sheets" when NEXT_PUBLIC_STORAGE=sheets at build time; otherwise this browser's storage. */
export const STORAGE_MODE: "local" | "sheets" = process.env.NEXT_PUBLIC_STORAGE === "sheets" ? "sheets" : "local";

type Action =
  | { type: "hydrate"; state: InventoryState }
  | { type: "upsert"; batch: Batch }
  | { type: "remove"; id: string };

const reducer = (state: InventoryState, action: Action): InventoryState => {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "upsert": {
      const exists = state.batches.some((b) => b.id === action.batch.id);
      return {
        ...state,
        batches: exists ? state.batches.map((b) => (b.id === action.batch.id ? action.batch : b)) : [action.batch, ...state.batches],
      };
    }
    case "remove":
      return { ...state, batches: state.batches.filter((b) => b.id !== action.id) };
    default:
      return state;
  }
};

export type SyncStatus = "saved" | "saving" | "error";

export interface Notice {
  id: number;
  message: string;
  tone: "neutral" | "error";
}

interface InventoryContextValue {
  mode: typeof STORAGE_MODE;
  ready: boolean;
  batches: Batch[];
  getBatch: (id: string) => Batch | undefined;
  upsert: (batch: Batch) => void;
  remove: (id: string) => void;
  replaceAll: (state: InventoryState) => void;
  /** Local mode: storage full/blocked. */
  saveFailed: boolean;
  /** Sheets mode */
  status: SyncStatus;
  statusMessage: string | null;
  retry: () => void;
  locked: boolean;
  unlock: (passcode: string) => Promise<boolean>;
  loadError: string | null;
  reload: () => void;
  notice: Notice | null;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

type Pending = Batch | { deleted: true };

export const InventoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const hydrated = useRef(false);
  const versions = useRef<Record<string, string>>({});
  const pending = useRef(new Map<string, Pending>());
  const flushing = useRef(false);
  const retryTimer = useRef<number | null>(null);
  const failures = useRef(0);
  const noticeSeq = useRef(0);

  const say = useCallback((message: string, tone: Notice["tone"] = "neutral") => setNotice({ id: ++noticeSeq.current, message, tone }), []);

  /** Take the server's copy of every batch that has no unsaved local change. */
  const adopt = useCallback((snap: Snapshot) => {
    versions.current = snap.versions;
    const local = stateRef.current.batches;
    const keep = new Map([...pending.current.entries()].filter(([, p]) => !("deleted" in p)) as [string, Batch][]);
    const deleted = new Set([...pending.current.entries()].filter(([, p]) => "deleted" in p).map(([id]) => id));
    const merged = snap.state.batches.filter((b) => !deleted.has(b.id)).map((b) => keep.get(b.id) ?? b);
    // Locally-created batches the server hasn't seen yet stay, in their original position.
    const serverIds = new Set(snap.state.batches.map((b) => b.id));
    const fresh = local.filter((b) => keep.has(b.id) && !serverIds.has(b.id));
    dispatch({ type: "hydrate", state: { version: 1, batches: [...fresh, ...merged] } });
  }, []);

  /* ---------- Sheets mode: background write queue ---------- */

  const flush = useCallback(async () => {
    if (STORAGE_MODE !== "sheets" || flushing.current) return;
    flushing.current = true;
    setStatus("saving");
    try {
      while (pending.current.size) {
        const [id, change] = pending.current.entries().next().value as [string, Pending];
        pending.current.delete(id);
        const base = versions.current[id] ?? null;
        const res = "deleted" in change ? await remote.deleteBatch(id, base) : await remote.saveBatch(change, base);

        if (res.ok) {
          failures.current = 0;
          if ("deleted" in change) delete versions.current[id];
          else versions.current[id] = res.snapshot.versions[id] ?? versions.current[id]!;
          // Keep other batches' versions current too (the server re-read the whole sheet).
          for (const [bid, v] of Object.entries(res.snapshot.versions)) if (!pending.current.has(bid)) versions.current[bid] = v;
          continue;
        }
        if (res.kind === "conflict") {
          adopt(res.snapshot);
          say("This batch was changed in Google Sheets, so it’s been reloaded. Please redo your last change.", "error");
          continue;
        }
        if (res.kind === "locked") {
          pending.current.set(id, pending.current.get(id) ?? change);
          setLocked(true);
          break;
        }
        if (res.kind === "invalid") {
          say(res.message, "error");
          continue;
        }
        // network / sheets / config — keep the change and retry with backoff
        if (!pending.current.has(id)) pending.current = new Map([[id, change], ...pending.current]);
        failures.current += 1;
        setStatus("error");
        setStatusMessage(res.message);
        const delay = [3, 10, 30, 60][Math.min(failures.current - 1, 3)]! * 1000;
        if (retryTimer.current) window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(() => void flush(), delay);
        return;
      }
      if (!pending.current.size) {
        setStatus("saved");
        setStatusMessage(null);
      }
    } finally {
      flushing.current = false;
      // A change may have arrived while the last request was in flight.
      if (pending.current.size && failures.current === 0 && !locked) queueMicrotask(() => void flush());
    }
  }, [adopt, say, locked]);

  const loadRemote = useCallback(async () => {
    const res = await remote.load();
    if (res.ok) {
      adopt(res.snapshot);
      setLoadError(null);
      setLocked(false);
    } else if (res.kind === "locked") setLocked(true);
    else setLoadError(res.kind === "conflict" ? "Couldn’t load the sheet." : res.message);
    setReady(true);
  }, [adopt]);

  /* ---------- hydrate ---------- */

  useEffect(() => {
    if (STORAGE_MODE === "sheets") {
      void loadRemote();
      const onVisible = () => {
        if (document.visibilityState === "visible" && !pending.current.size && !flushing.current) void loadRemote();
      };
      const onUnload = (e: BeforeUnloadEvent) => {
        if (pending.current.size) e.preventDefault();
      };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("beforeunload", onUnload);
      const onOnline = () => void flush();
      window.addEventListener("online", onOnline);
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("beforeunload", onUnload);
        window.removeEventListener("online", onOnline);
      };
    }
    // Local mode: seed the owners' "new stock" sheet as the default batch on first open.
    const initial = isFirstRun() ? { version: 1 as const, batches: [newBatch(seed)] } : load();
    dispatch({ type: "hydrate", state: initial });
    hydrated.current = true;
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("sillage:")) dispatch({ type: "hydrate", state: load() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (STORAGE_MODE !== "local" || !hydrated.current) return;
    setSaveFailed(!save(state));
  }, [state]);

  /* ---------- public API ---------- */

  const getBatch = useCallback((id: string) => state.batches.find((b) => b.id === id), [state.batches]);

  const upsert = useCallback(
    (batch: Batch) => {
      dispatch({ type: "upsert", batch });
      if (STORAGE_MODE === "sheets") {
        pending.current.set(batch.id, batch);
        void flush();
      }
    },
    [flush],
  );

  const remove = useCallback(
    (id: string) => {
      dispatch({ type: "remove", id });
      if (STORAGE_MODE === "sheets") {
        pending.current.set(id, { deleted: true });
        void flush();
      }
    },
    [flush],
  );

  const replaceAll = useCallback(
    (next: InventoryState) => {
      dispatch({ type: "hydrate", state: next });
      if (STORAGE_MODE !== "sheets") return;
      pending.current.clear();
      setStatus("saving");
      void remote.replaceAll(next).then((res) => {
        if (res.ok) {
          versions.current = res.snapshot.versions;
          setStatus("saved");
          setStatusMessage(null);
        } else {
          setStatus("error");
          setStatusMessage(res.kind === "locked" || res.kind === "conflict" ? "Couldn’t replace the sheet." : res.message);
          if (res.kind === "locked") setLocked(true);
        }
      });
    },
    [],
  );

  const retry = useCallback(() => {
    failures.current = 0;
    if (retryTimer.current) window.clearTimeout(retryTimer.current);
    void flush();
  }, [flush]);

  const unlock = useCallback(
    async (passcode: string) => {
      const ok = await remote.unlock(passcode);
      if (ok) {
        setLocked(false);
        await loadRemote();
        if (pending.current.size) void flush();
      }
      return ok;
    },
    [loadRemote, flush],
  );

  const reload = useCallback(() => {
    setLoadError(null);
    setReady(false);
    void loadRemote();
  }, [loadRemote]);

  const value = useMemo(
    () => ({ mode: STORAGE_MODE, ready, batches: state.batches, getBatch, upsert, remove, replaceAll, saveFailed, status, statusMessage, retry, locked, unlock, loadError, reload, notice }),
    [ready, state.batches, getBatch, upsert, remove, replaceAll, saveFailed, status, statusMessage, retry, locked, unlock, loadError, reload, notice],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside <InventoryProvider>");
  return ctx;
};
