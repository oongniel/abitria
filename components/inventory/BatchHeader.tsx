"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Flacon, breakEvenTop } from "@/components/elements/Flacon";
import { realizedTone, toneFor } from "@/components/elements/Delta";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EASE } from "@/lib/animation";
import type { BatchFigures } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { money, percent, plain, shortDate } from "@/lib/format";
import type { Batch } from "@/typings/inventory";

const aed0 = (n: number) => money(n, "AED", { decimals: 0 });
const php0 = (n: number) => money(n, "PHP");

const Figure = ({ label, value, format, tone, note }: { label: string; value: number; format: (n: number) => string; tone?: string; note?: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <dt className="b2 text-ink-2">{label}</dt>
    <dd className="flex flex-col gap-1">
      <AnimatedNumber value={value} format={format} className={cn("figure text-[1.625rem] leading-none md:text-[1.875rem]", tone)} />
      {note && <span className="b2 num leading-snug text-ink-2">{note}</span>}
    </dd>
  </div>
);

export const BatchHeader = ({ batch, f, actions }: { batch: Batch; f: BatchFigures; actions: React.ReactNode }) => {
  const reduce = useReducedMotion();
  const toBreakEven = Math.max(0, -f.realizedProfitAed);
  const status =
    f.units === 0
      ? "Add perfumes to see how this batch will do."
      : f.inProfit
        ? `In profit. Every bottle from here adds to it.`
        : f.revenueAed > 0
          ? `${percent(f.recovered)} of the cost is back. ${aed0(toBreakEven)} to break even.`
          : `Nothing sold yet. Break-even comes after about ${percent(f.breakEvenAt)} of the bottles.`;

  return (
    <header className="grid gap-6 md:grid-cols-[auto_1fr] md:gap-10">
      <div className="flex items-end gap-5 md:block">
        <div className="relative">
          <Flacon level={f.units ? f.left / f.units : 0} breakEvenAt={f.units ? f.breakEvenAt : undefined} inProfit={f.inProfit} label={`${plain(f.left)} of ${plain(f.units)} bottles left`} />
          {f.units > 0 && f.breakEvenAt < 1 && (
            <motion.span
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="b2 absolute start-full ms-2 -translate-y-1/2 whitespace-nowrap text-ink-2"
              style={{ top: `${breakEvenTop(f.breakEvenAt) * 100}%` }}
            >
              break-even
            </motion.span>
          )}
        </div>
        <p className="body2 num pb-2 text-ink-2 md:hidden">
          <span className="t2 text-ink">{plain(f.left)}</span> of {plain(f.units)} bottles left
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="h1">{batch.name}</h1>
            <p className="body2 num text-ink-2">
              Bought {shortDate(batch.purchasedOn)}. 1 AED = ₱{plain(batch.rateAedToPhp, 2).replace(/\.00$/, "")}, {php0(batch.commissionPhp)} reseller commission.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>

        <motion.p
          key={status}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE.out }}
          className={cn("body1 max-w-prose", f.inProfit ? "text-amber" : "text-ink")}
        >
          {status}
        </motion.p>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5 lg:grid-cols-4">
          <Figure label="Profit so far" value={f.realizedProfitAed} format={(n) => money(n, "AED", { decimals: 0 })} tone={realizedTone(f.realizedProfitAed, f.revenueAed, f.left)} note={`Sales ${aed0(f.revenueAed)} less cost ${aed0(f.totalCostAed)}`} />
          <Figure label="If everything sells" value={f.projectedProfitAed} format={aed0} tone={toneFor(f.projectedProfitAed)} note={`${percent(f.projectedMarginPct)} on ${aed0(f.projectedSalesAed)} in sales`} />
          <Figure label="Revenue so far" value={f.revenuePhp} format={php0} note={`of ${php0(f.projectedSalesPhp)} projected`} />
          <Figure label="Bottles sold" value={f.sold} format={(n) => plain(Math.round(n))} note={`${percent(f.sellThrough)} of ${plain(f.units)}`} />
        </dl>

        {f.partners.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="b2 text-ink-2">Profit share if everything sells</h2>
            <ul className="flex flex-wrap gap-2">
              {f.partners.map((p) => (
                <li key={p.id} className="body2 num flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pe-3 ps-1.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-oud-soft text-[0.75rem] font-semibold text-oud">{p.name.slice(0, 1).toUpperCase()}</span>
                  <span className="font-medium">{p.name}</span>
                  <span className={toneFor(p.projectedAed)}>{aed0(p.projectedAed)}</span>
                  <span className="text-ink-2">({percent(p.share)})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};
