import type { Batch, BatchItem } from "@/typings/inventory";

/** Per-bottle and per-line figures — mirrors the owners' spreadsheet columns. */
export interface ItemFigures {
  /** "less com" — retail minus reseller commission, PHP */
  netPhp: number;
  /** "cost ph" — cost converted to PHP */
  costPhp: number;
  /** "Margin value" — per bottle, PHP */
  marginPhp: number;
  /** "Margin%" — 0..1 of net price */
  marginPct: number;
  /** "total value" / "stock value" — line cost, AED */
  lineCostAed: number;
  /** "sales" — projected line revenue at net price, PHP */
  lineSalesPhp: number;
  sold: number;
  left: number;
  /** Actual revenue from recorded sales, PHP */
  revenuePhp: number;
}

export const itemFigures = (batch: Batch, item: BatchItem): ItemFigures => {
  const netPhp = item.retailPhp - batch.commissionPhp;
  const costPhp = item.costAed * batch.rateAedToPhp;
  const marginPhp = netPhp - costPhp;
  const marginPct = netPhp > 0 ? marginPhp / netPhp : 0;
  const sales = batch.sales.filter((s) => s.itemId === item.id);
  const sold = sales.reduce((n, s) => n + s.qty, 0);
  const revenuePhp = sales.reduce((n, s) => n + s.qty * s.unitPricePhp, 0);
  return {
    netPhp,
    costPhp,
    marginPhp,
    marginPct,
    lineCostAed: item.costAed * item.qty,
    lineSalesPhp: netPhp * item.qty,
    sold,
    left: Math.max(0, item.qty - sold),
    revenuePhp,
  };
};

export interface PartnerShare {
  id: string;
  name: string;
  capitalAed: number;
  share: number;
  projectedAed: number;
  realizedAed: number;
}

export interface BatchFigures {
  units: number;
  sold: number;
  left: number;
  /** 0..1 */
  sellThrough: number;
  goodsCostAed: number;
  expensesAed: number;
  totalCostAed: number;
  capitalAed: number;
  /** capital − total cost; negative means the batch cost more than was put in */
  capitalLeftAed: number;
  projectedSalesPhp: number;
  projectedSalesAed: number;
  projectedProfitAed: number;
  projectedMarginPct: number;
  revenuePhp: number;
  revenueAed: number;
  /** revenue so far − everything the batch cost; negative until break-even */
  realizedProfitAed: number;
  /** 0..1 — share of total cost already recovered */
  recovered: number;
  /** 0..1 — sell-through at which the batch breaks even, assuming the rest sells at net */
  breakEvenAt: number;
  inProfit: boolean;
  partners: PartnerShare[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const batchFigures = (batch: Batch): BatchFigures => {
  const rows = batch.items.map((it) => ({ it, f: itemFigures(batch, it) }));
  const units = rows.reduce((n, r) => n + r.it.qty, 0);
  const sold = rows.reduce((n, r) => n + Math.min(r.f.sold, r.it.qty), 0);
  const goodsCostAed = rows.reduce((n, r) => n + r.f.lineCostAed, 0);
  const expensesAed = batch.expenses.reduce((n, e) => n + e.amountAed, 0);
  const totalCostAed = goodsCostAed + expensesAed;
  const capitalAed = batch.partners.reduce((n, p) => n + p.capitalAed, 0);
  const rate = batch.rateAedToPhp || 1;
  const projectedSalesPhp = rows.reduce((n, r) => n + r.f.lineSalesPhp, 0);
  const projectedSalesAed = projectedSalesPhp / rate;
  const projectedProfitAed = projectedSalesAed - totalCostAed;
  const revenuePhp = rows.reduce((n, r) => n + r.f.revenuePhp, 0);
  const revenueAed = revenuePhp / rate;
  const realizedProfitAed = revenueAed - totalCostAed;
  const breakEvenAt =
    projectedSalesAed > 0 ? Math.min(1, totalCostAed / projectedSalesAed) : 1;

  const shareBase = capitalAed > 0 ? capitalAed : batch.partners.length;
  const partners: PartnerShare[] = batch.partners.map((p) => {
    const share =
      shareBase === 0 ? 0 : capitalAed > 0 ? p.capitalAed / shareBase : 1 / shareBase;
    return {
      id: p.id,
      name: p.name,
      capitalAed: p.capitalAed,
      share,
      projectedAed: round2(projectedProfitAed * share),
      realizedAed: round2(Math.max(0, realizedProfitAed) * share),
    };
  });

  return {
    units,
    sold,
    left: units - sold,
    sellThrough: units > 0 ? sold / units : 0,
    goodsCostAed,
    expensesAed,
    totalCostAed,
    capitalAed,
    capitalLeftAed: capitalAed - totalCostAed,
    projectedSalesPhp,
    projectedSalesAed,
    projectedProfitAed,
    projectedMarginPct: projectedSalesAed > 0 ? projectedProfitAed / projectedSalesAed : 0,
    revenuePhp,
    revenueAed,
    realizedProfitAed,
    recovered: totalCostAed > 0 ? Math.min(1, revenueAed / totalCostAed) : 0,
    breakEvenAt,
    inProfit: realizedProfitAed >= 0 && revenueAed > 0,
    partners,
  };
};
