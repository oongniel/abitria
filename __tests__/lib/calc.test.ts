import { describe, expect, it } from "vitest";

import sample from "@/content/sample-batch.json";
import { newBatch, recordSale } from "@/lib/batch-ops";
import { batchFigures, itemFigures } from "@/lib/calc";

const batch = newBatch(sample);

describe("item figures match the owners' sheet", () => {
  it("Liquid Brun row", () => {
    const item = batch.items.find((i) => i.name === "Liquid Brun")!;
    const f = itemFigures(batch, item);
    expect(f.netPhp).toBe(2350); // less com
    expect(f.costPhp).toBe(1462); // cost ph
    expect(f.lineCostAed).toBe(516); // total value
    expect(f.lineSalesPhp).toBe(14100); // sales
    expect(f.marginPhp).toBe(888); // Margin value
    expect(f.marginPct).toBeCloseTo(0.37787, 4); // Margin%
  });
});

describe("batch totals", () => {
  const f = batchFigures(batch);
  it("matches the sheet's totals row", () => {
    expect(f.units).toBe(77);
    expect(f.goodsCostAed).toBe(4211);
    expect(f.projectedSalesPhp).toBe(134350);
    expect(f.projectedSalesAed).toBeCloseTo(7902.94, 2);
    expect(f.capitalAed).toBe(4200);
  });
  it("profit is sales minus what the batch actually cost", () => {
    expect(f.projectedProfitAed).toBeCloseTo(7902.94 - 4211, 2);
    expect(f.capitalLeftAed).toBe(-11);
  });
  it("splits profit by capital share (equal capital → equal split)", () => {
    expect(f.partners.map((p) => p.share)).toEqual([0.5, 0.5]);
    expect(f.partners[0]!.projectedAed).toBeCloseTo(f.projectedProfitAed / 2, 1);
  });
  it("starts below break-even with nothing sold", () => {
    expect(f.inProfit).toBe(false);
    expect(f.realizedProfitAed).toBe(-4211);
    expect(f.breakEvenAt).toBeCloseTo(4211 / 7902.94, 3);
  });
});

describe("sales", () => {
  it("reduce stock and move realized profit", () => {
    const item = batch.items[0]!;
    const sold = recordSale(batch, { itemId: item.id, qty: 2, unitPricePhp: 2350, channel: "reseller", date: "2026-09-01" });
    const fi = itemFigures(sold, item);
    const f = batchFigures(sold);
    expect(fi.sold).toBe(2);
    expect(fi.left).toBe(4);
    expect(f.revenuePhp).toBe(4700);
    expect(f.realizedProfitAed).toBeCloseTo(4700 / 17 - 4211, 2);
  });
  it("expenses count against profit", () => {
    const withShipping = { ...batch, expenses: [{ id: "e1", label: "Shipping", amountAed: 300 }] };
    expect(batchFigures(withShipping).projectedProfitAed).toBeCloseTo(7902.94 - 4511, 2);
  });
});
