// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { newBatch } from "@/lib/batch-ops";
import { batchFigures } from "@/lib/calc";
import { parseWorkbook } from "@/lib/spreadsheet";

const file = readFileSync(join(__dirname, "../fixtures/new stock.xlsx"));
const buf = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;

describe("importing the owners' sheet", () => {
  const parsed = parseWorkbook(buf, "new stock.xlsx");

  it("reads every perfume row", () => {
    expect(parsed.items).toHaveLength(13);
    expect(parsed.items[0]).toMatchObject({ brand: "French Avenue", name: "Liquid Brun", retailPhp: 2650, costAed: 86, qty: 6 });
  });
  it("detects commission and exchange rate from the formulas' results", () => {
    expect(parsed.commissionPhp).toBe(300);
    expect(parsed.rateAedToPhp).toBe(17);
  });
  it("picks up partner capital under the 'capital' label", () => {
    expect(parsed.partners).toEqual([
      { name: "Yet", capitalAed: 2100 },
      { name: "Pat", capitalAed: 2100 },
    ]);
  });
  it("reproduces the sheet's total sales", () => {
    expect(batchFigures(newBatch(parsed)).projectedSalesPhp).toBe(134350);
  });
});
