"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Trash2 } from "lucide-react";

import type { Commit } from "@/components/inventory/StockTable";
import { Button } from "@/components/ui/button";
import { EASE } from "@/lib/animation";
import { removeSale } from "@/lib/batch-ops";
import { cn } from "@/lib/cn";
import { money, plain, shortDate } from "@/lib/format";
import type { Batch } from "@/typings/inventory";

export const SalesList = ({ batch, commit, onGoToStock }: { batch: Batch; commit: Commit; onGoToStock: () => void }) => {
  const reduce = useReducedMotion();
  const sales = [...batch.sales].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const byDate = sales.reduce<Record<string, typeof sales>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});
  const reseller = batch.sales.filter((s) => s.channel === "reseller");
  const direct = batch.sales.filter((s) => s.channel === "direct");
  const sum = (xs: typeof sales) => xs.reduce((n, s) => n + s.qty * s.unitPricePhp, 0);
  const bottles = (xs: typeof sales) => xs.reduce((n, s) => n + s.qty, 0);

  if (!sales.length) {
    return (
      <div className="panel flex flex-col items-start gap-4 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h3 className="t1">No sales recorded yet</h3>
          <p className="body2 max-w-prose text-ink-2">Use Sell on any perfume in Stock. Each sale lowers what’s left and moves the batch toward break-even.</p>
        </div>
        <Button variant="secondary" onClick={onGoToStock}>
          Go to stock
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="body2 num text-ink-2">
        Through resellers: <span className="font-semibold text-ink">{money(sum(reseller), "PHP")}</span> from {plain(bottles(reseller))} bottles. Direct:{" "}
        <span className="font-semibold text-ink">{money(sum(direct), "PHP")}</span> from {plain(bottles(direct))}.
      </p>
      {Object.entries(byDate).map(([date, list]) => (
        <section key={date} className="flex flex-col gap-2">
          <h3 className="b2 flex items-center justify-between px-1 text-ink-2">
            <span>{shortDate(date)}</span>
            <span className="num">{money(sum(list), "PHP")}</span>
          </h3>
          <ul className="panel divide-y divide-line/70">
            <AnimatePresence initial={false}>
              {list.map((s) => {
                const it = batch.items.find((i) => i.id === s.itemId);
                return (
                  <motion.li
                    key={s.id}
                    layout={!reduce}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25, ease: EASE.out }}
                    className="body2 num flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="t3 truncate">{it?.name ?? "Removed perfume"}</span>
                      <span className="b2 truncate text-ink-2">
                        {s.qty} × {money(s.unitPricePhp, "PHP")}
                        {s.note ? `, ${s.note}` : ""}
                      </span>
                    </div>
                    <span className={cn("b2 rounded-full px-2 py-1", s.channel === "direct" ? "bg-amber-soft text-amber" : "bg-surface-2 text-ink-2")}>
                      {s.channel === "direct" ? "Direct" : "Reseller"}
                    </span>
                    <span className="t3 w-24 text-end">{money(s.qty * s.unitPricePhp, "PHP")}</span>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete sale" className="hover:text-rose" onClick={() => commit(removeSale(batch, s.id), "Sale deleted.", { undo: true })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  );
};
