// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteBatchRoute, PUT as putBatch } from "@/app/api/batches/[id]/route";
import { GET, PUT as putState } from "@/app/api/state/route";
import { POST as unlock } from "@/app/api/unlock/route";
import { setClient } from "@/lib/server/repository";
import { memoryClient } from "@/lib/server/sheets-client";
import type { Batch, InventoryState, Sale } from "@/typings/inventory";

beforeEach(() => {
  process.env.APP_PASSCODE = "admin@abitria";
  process.env.SELLER_PASSCODE = "seller@abitria";
  setClient(memoryClient());
});
afterEach(() => {
  delete process.env.APP_PASSCODE;
  delete process.env.SELLER_PASSCODE;
});

const signIn = async (passcode: string) => {
  const res = await unlock(new Request("http://x/api/unlock", { method: "POST", body: JSON.stringify({ passcode }) }));
  expect(res.status).toBe(200);
  return res.headers.get("set-cookie")!.split(";")[0]!;
};

type Snap = { state: InventoryState; versions: Record<string, string>; role?: string };
const read = async (cookie: string): Promise<Snap> => {
  const res = await GET(new Request("http://x/api/state", { headers: { cookie } }));
  expect(res.status).toBe(200);
  return (await res.json()) as Snap;
};

const save = (cookie: string, batch: Batch, baseVersion: string | null) =>
  putBatch(new Request(`http://x/api/batches/${batch.id}`, { method: "PUT", headers: { cookie }, body: JSON.stringify({ batch, baseVersion }) }), {
    params: Promise.resolve({ id: batch.id }),
  });

const sale = (over: Partial<Sale> & { itemId: string }): Sale => ({ id: "s_new", qty: 1, unitPricePhp: 2000, channel: "reseller", date: "2026-09-25", ...over });

describe("seller sign-in", () => {
  it("hands out a seller session for the seller passcode", async () => {
    const res = await unlock(new Request("http://x/api/unlock", { method: "POST", body: JSON.stringify({ passcode: "seller@abitria" }) }));
    expect(await res.json()).toMatchObject({ role: "seller" });
  });

  it("refuses the seller passcode when none is configured", async () => {
    delete process.env.SELLER_PASSCODE;
    const res = await unlock(new Request("http://x/api/unlock", { method: "POST", body: JSON.stringify({ passcode: "seller@abitria" }) }));
    expect(res.status).toBe(401);
  });

  it("does not let a seller passcode that copies the admin's grant admin access", async () => {
    process.env.SELLER_PASSCODE = "admin@abitria";
    const res = await unlock(new Request("http://x/api/unlock", { method: "POST", body: JSON.stringify({ passcode: "admin@abitria" }) }));
    expect(await res.json()).toMatchObject({ role: "admin" });
  });
});

describe("what a seller receives", () => {
  it("never sends cost, capital or expenses", async () => {
    const admin = await read(await signIn("admin@abitria"));
    const withCost = admin.state.batches[0]!.items.some((i) => i.costAed > 0);
    expect(withCost).toBe(true);

    const seller = await read(await signIn("seller@abitria"));
    expect(seller.role).toBe("seller");
    expect(seller.state.batches[0]!.items.every((i) => i.costAed === 0)).toBe(true);
    expect(seller.state.batches[0]!.partners).toEqual([]);
    expect(seller.state.batches[0]!.expenses).toEqual([]);
    expect(JSON.stringify(seller.state)).not.toContain("capitalAed\":1");
  });

  it("still sends the real versions, so the seller's saves detect conflicts", async () => {
    const admin = await read(await signIn("admin@abitria"));
    const seller = await read(await signIn("seller@abitria"));
    expect(seller.versions).toEqual(admin.versions);
  });
});

describe("what a seller may write", () => {
  it("records a sale", async () => {
    const cookie = await signIn("seller@abitria");
    const snap = await read(cookie);
    const batch = snap.state.batches[0]!;
    const item = batch.items[0]!;

    const res = await save(cookie, { ...batch, sales: [sale({ itemId: item.id }), ...batch.sales] }, snap.versions[batch.id]!);
    expect(res.status).toBe(200);

    const after = await read(await signIn("admin@abitria"));
    const saved = after.state.batches[0]!.sales.find((s) => s.id === "s_new");
    expect(saved).toMatchObject({ qty: 1, soldBy: "seller" });
  });

  it("cannot change prices, cost or stock, even with a tampered payload", async () => {
    const cookie = await signIn("seller@abitria");
    const snap = await read(cookie);
    const batch = snap.state.batches[0]!;
    const item = batch.items[0]!;
    const before = (await read(await signIn("admin@abitria"))).state.batches[0]!.items[0]!;

    const res = await save(cookie, { ...batch, name: "Renamed", items: batch.items.map((i) => ({ ...i, costAed: 1, retailPhp: 1, qty: 999 })) }, snap.versions[batch.id]!);
    expect(res.status).toBe(200);

    const after = (await read(await signIn("admin@abitria"))).state.batches[0]!;
    expect(after.name).toBe(batch.name);
    expect(after.items[0]).toMatchObject({ costAed: before.costAed, retailPhp: before.retailPhp, qty: before.qty });
  });

  it("cannot edit or delete the owner's sales", async () => {
    const adminCookie = await signIn("admin@abitria");
    const first = await read(adminCookie);
    const batch = first.state.batches[0]!;
    const item = batch.items[0]!;
    const owners = await save(adminCookie, { ...batch, sales: [sale({ id: "s_owner", itemId: item.id }), ...batch.sales] }, first.versions[batch.id]!);
    expect(owners.status).toBe(200);

    const cookie = await signIn("seller@abitria");
    const snap = await read(cookie);
    const mine = snap.state.batches[0]!;

    const edited = await save(cookie, { ...mine, sales: mine.sales.map((s) => (s.id === "s_owner" ? { ...s, qty: 9 } : s)) }, snap.versions[mine.id]!);
    expect(edited.status).toBe(403);

    const deleted = await save(cookie, { ...mine, sales: mine.sales.filter((s) => s.id !== "s_owner") }, snap.versions[mine.id]!);
    expect(deleted.status).toBe(403);

    const after = (await read(adminCookie)).state.batches[0]!;
    expect(after.sales.find((s) => s.id === "s_owner")).toMatchObject({ qty: 1 });
  });

  it("may correct a sale it recorded itself", async () => {
    const cookie = await signIn("seller@abitria");
    const first = await read(cookie);
    const batch = first.state.batches[0]!;
    const item = batch.items[0]!;
    expect((await save(cookie, { ...batch, sales: [sale({ itemId: item.id }), ...batch.sales] }, first.versions[batch.id]!)).status).toBe(200);

    const snap = await read(cookie);
    const mine = snap.state.batches[0]!;
    const res = await save(cookie, { ...mine, sales: mine.sales.map((s) => (s.id === "s_new" ? { ...s, qty: 2 } : s)) }, snap.versions[mine.id]!);
    expect(res.status).toBe(200);
    expect((await read(cookie)).state.batches[0]!.sales.find((s) => s.id === "s_new")).toMatchObject({ qty: 2 });
  });

  it("cannot sell more bottles than the batch holds", async () => {
    const cookie = await signIn("seller@abitria");
    const snap = await read(cookie);
    const batch = snap.state.batches[0]!;
    const item = batch.items[0]!;
    const res = await save(cookie, { ...batch, sales: [sale({ itemId: item.id, qty: item.qty + 5 }), ...batch.sales] }, snap.versions[batch.id]!);
    expect(res.status).toBe(403);
  });
});

describe("owner-only routes", () => {
  it("refuses a seller deleting a batch or replacing the data", async () => {
    const cookie = await signIn("seller@abitria");
    const snap = await read(cookie);
    const id = snap.state.batches[0]!.id;

    const del = await deleteBatchRoute(new Request(`http://x/api/batches/${id}?baseVersion=${snap.versions[id]}`, { method: "DELETE", headers: { cookie } }), {
      params: Promise.resolve({ id }),
    });
    expect(del.status).toBe(403);

    const replaced = await putState(new Request("http://x/api/state", { method: "PUT", headers: { cookie }, body: JSON.stringify({ version: 1, batches: [] }) }));
    expect(replaced.status).toBe(403);

    expect((await read(cookie)).state.batches).toHaveLength(1);
  });
});
