import type { Batch, InventoryState } from "@/typings/inventory";

export interface Snapshot {
  state: InventoryState;
  versions: Record<string, string>;
}

export type RemoteResult =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; kind: "locked" }
  | { ok: false; kind: "conflict"; snapshot: Snapshot }
  | { ok: false; kind: "config" | "sheets" | "network" | "invalid"; message: string };

const request = async (path: string, init?: RequestInit): Promise<RemoteResult> => {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store", credentials: "same-origin" });
  } catch {
    return { ok: false, kind: "network", message: "No connection. Changes will be saved when you’re back online." };
  }
  const body = (await res.json().catch(() => ({}))) as Partial<Snapshot> & { error?: string; message?: string };
  if (res.ok && body.state && body.versions) return { ok: true, snapshot: { state: body.state, versions: body.versions } };
  if (res.status === 401) return { ok: false, kind: "locked" };
  if (res.status === 409 && body.state && body.versions) return { ok: false, kind: "conflict", snapshot: { state: body.state, versions: body.versions } };
  if (res.status === 503) return { ok: false, kind: "config", message: body.message ?? "Google Sheets isn’t set up." };
  if (res.status === 400) return { ok: false, kind: "invalid", message: body.message ?? "The server rejected that change." };
  return { ok: false, kind: "sheets", message: body.message ?? `Google Sheets didn’t respond (${res.status}).` };
};

export const remote = {
  load: () => request("/api/state"),
  saveBatch: (batch: Batch, baseVersion: string | null) =>
    request(`/api/batches/${encodeURIComponent(batch.id)}`, { method: "PUT", body: JSON.stringify({ batch, baseVersion }) }),
  deleteBatch: (id: string, baseVersion: string | null) =>
    request(`/api/batches/${encodeURIComponent(id)}?baseVersion=${encodeURIComponent(baseVersion ?? "")}`, { method: "DELETE" }),
  replaceAll: (state: InventoryState) => request("/api/state", { method: "PUT", body: JSON.stringify(state) }),
  unlock: async (passcode: string) => {
    try {
      const res = await fetch("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
      return res.ok;
    } catch {
      return false;
    }
  },
};
