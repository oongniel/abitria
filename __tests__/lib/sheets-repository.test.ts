// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { recordSale } from "@/lib/batch-ops";
import { ConflictError, deleteBatch, readSnapshot, replaceState, saveBatch, setClient } from "@/lib/server/repository";
import { TABS } from "@/lib/server/sheet-schema";
import { memoryClient } from "@/lib/server/sheets-client";

let sheet: ReturnType<typeof memoryClient>;
beforeEach(() => {
  sheet = memoryClient();
  setClient(sheet);
});

const header = (tab: string) => sheet.tabs[tab]![0] as string[];
const col = (tab: string, name: string) => header(tab).indexOf(name);

describe("Google Sheets storage", () => {
  it("creates the tabs and seeds the new stock batch on an empty spreadsheet", async () => {
    const { state } = await readSnapshot();
    expect(Object.keys(sheet.tabs)).toEqual(expect.arrayContaining(["Batches", "Items", "Sales", "Partners", "Expenses", "Summary"]));
    expect(state.batches).toHaveLength(1);
    expect(state.batches[0]!.name).toBe("New stock");
    expect(state.batches[0]!.items).toHaveLength(13);
    expect(sheet.tabs.Items!.length).toBe(14); // header + 13 perfumes
  });

  it("round-trips a sale and returns a version the next read agrees with", async () => {
    const snap = await readSnapshot();
    const b = snap.state.batches[0]!;
    const next = recordSale(b, { itemId: b.items[0]!.id, qty: 2, unitPricePhp: 2350, channel: "reseller", date: "2026-09-25", note: "Maria" });
    const saved = await saveBatch(next, snap.versions[b.id]!);
    const again = await readSnapshot();
    expect(again.versions[b.id]).toBe(saved.versions[b.id]);
    expect(again.state.batches[0]!.sales[0]).toMatchObject({ qty: 2, unitPricePhp: 2350, note: "Maria" });
    // Readable in Sheets: the sale row names the perfume
    expect(sheet.tabs.Sales![1]![col("Sales", "perfume")]).toBe("Liquid Brun");
  });

  it("refuses to overwrite a batch that was edited directly in the sheet", async () => {
    const snap = await readSnapshot();
    const b = snap.state.batches[0]!;
    sheet.tabs.Items![1]![col("Items", "qty")] = 10; // owner edits stock in Sheets
    const attempt = saveBatch({ ...b, name: "Renamed" }, snap.versions[b.id]!);
    await expect(attempt).rejects.toBeInstanceOf(ConflictError);
    const fresh = await readSnapshot();
    expect(fresh.state.batches[0]!.items[0]!.qty).toBe(10);
    expect(fresh.state.batches[0]!.name).toBe("New stock");
  });

  it("accepts rows added by hand without ids, linking them by batch name and perfume", async () => {
    await readSnapshot();
    const h = header("Items");
    const row = h.map(() => "" as string | number);
    row[h.indexOf("batchName")] = "New stock";
    row[h.indexOf("brand")] = "Lattafa";
    row[h.indexOf("name")] = "Khamrah";
    row[h.indexOf("retailPhp")] = 2200;
    row[h.indexOf("costAed")] = 55;
    row[h.indexOf("qty")] = 4;
    sheet.tabs.Items!.push(row);
    const hs = header("Sales");
    const sale = hs.map(() => "" as string | number);
    sale[hs.indexOf("batchName")] = "New stock";
    sale[hs.indexOf("perfume")] = "Khamrah";
    sale[hs.indexOf("date")] = 46290; // a date typed in Sheets arrives as a serial number
    sale[hs.indexOf("qty")] = 1;
    sale[hs.indexOf("unitPricePhp")] = 1900;
    sale[hs.indexOf("channel")] = "Direct";
    sheet.tabs.Sales!.push(sale);

    const { state } = await readSnapshot();
    const b = state.batches[0]!;
    const khamrah = b.items.find((i) => i.name === "Khamrah")!;
    expect(khamrah.id).toMatch(/^i_/);
    expect(b.sales[0]).toMatchObject({ itemId: khamrah.id, channel: "direct", date: "2026-09-25" });
    // ids were written back so they stay stable
    expect(sheet.tabs.Items!.at(-1)![col("Items", "id")]).toBe(khamrah.id);
  });

  it("matches columns by header name, not position", async () => {
    await readSnapshot();
    sheet.tabs.Items = sheet.tabs.Items!.map((r) => [...r].reverse());
    const { state } = await readSnapshot();
    expect(state.batches[0]!.items[0]).toMatchObject({ name: "Liquid Brun", costAed: 86, qty: 6 });
  });

  it("deletes a batch and blanks its old rows", async () => {
    const snap = await readSnapshot();
    const id = snap.state.batches[0]!.id;
    await deleteBatch(id, snap.versions[id]!);
    const { state } = await readSnapshot();
    expect(state.batches).toHaveLength(0);
    expect(sheet.tabs.Items!.slice(1).every((r) => r.every((c) => c === ""))).toBe(true);
  });

  it("does not re-seed after everything is cleared", async () => {
    await readSnapshot();
    await replaceState({ version: 1, batches: [] });
    setClient(sheet); // simulates a server restart
    expect((await readSnapshot()).state.batches).toHaveLength(0);
  });

  it("writes a readable summary tab", async () => {
    await readSnapshot();
    expect(sheet.tabs.Summary![1]).toEqual(expect.arrayContaining(["New stock", 77, 0, 77]));
    expect(TABS.items.headers).toContain("batchName");
  });
});
