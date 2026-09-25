"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileUp, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { realizedTone } from "@/components/elements/Delta";
import { Flacon } from "@/components/elements/Flacon";
import { PageSkeleton } from "@/components/elements/Skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import sample from "@/content/sample-batch.json";
import { EASE } from "@/lib/animation";
import { newBatch } from "@/lib/batch-ops";
import { batchFigures, itemFigures } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { money, percent, plain, plural, shortDate } from "@/lib/format";
import { useInventory } from "@/lib/store";

const aed0 = (n: number) => money(n, "AED", { decimals: 0 });

export default function OverviewPage() {
  const { ready, batches, upsert } = useInventory();
  const router = useRouter();
  const toast = useToast();
  const reduce = useReducedMotion();

  if (!ready) return <PageSkeleton />;

  const loadSample = () => {
    const b = newBatch(sample);
    upsert(b);
    toast("Loaded the batch from your spreadsheet.");
    router.push(`/batches/${b.id}`);
  };

  if (!batches.length) {
    return (
      <div className="container-x grid min-h-[calc(100dvh-10rem)] items-center gap-10 py-10 md:grid-cols-[auto_1fr] md:gap-16">
        <Flacon level={0.08} className="mx-auto md:mx-0" label="An empty bottle" />
        <div className="flex max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="h1">Every batch, from purchase to profit</h1>
            <p className="body1 text-ink-2">
              Add the perfumes you bought in dirhams, record each sale in pesos, and see what’s left and what each partner earns, per batch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/batches/new" className={buttonVariants({ size: "lg" })}>
              <Plus className="h-4 w-4" /> Start a batch
            </Link>
            <Link href="/import" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <FileUp className="h-4 w-4" /> Import a spreadsheet
            </Link>
          </div>
          <button type="button" onClick={loadSample} className="b2 flex w-fit items-center gap-1.5 text-oud underline decoration-oud/30 underline-offset-4 transition-colors hover:decoration-oud">
            <Sparkles className="h-3.5 w-3.5" /> Or load the “new stock” sheet as a sample batch
          </button>
        </div>
      </div>
    );
  }

  const figs = batches.map((b) => ({ b, f: batchFigures(b) }));
  const left = figs.reduce((n, x) => n + x.f.left, 0);
  const realized = figs.reduce((n, x) => n + x.f.realizedProfitAed, 0);
  const inPlay = figs.filter((x) => x.f.left > 0).length;
  const low = figs
    .flatMap(({ b }) => b.items.map((it) => ({ b, it, f: itemFigures(b, it) })))
    .filter(({ it, f }) => f.sold > 0 && f.left > 0 && f.left <= Math.max(1, Math.round(it.qty * 0.25)))
    .slice(0, 6);

  return (
    <div className="container-x flex flex-col gap-10 py-6 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="h1">Batches</h1>
          <p className="body1 num max-w-prose text-ink-2">
            {plural(left, "bottle")} on hand across {plural(inPlay, "active batch", "active batches")}.{" "}
            {realized >= 0 ? (
              <>
                Profit so far: <span className="font-semibold text-amber">{aed0(realized)}</span>.
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">{aed0(-realized)}</span> still to recover before profit.
              </>
            )}
          </p>
        </div>
        <Link href="/batches/new" className={cn(buttonVariants(), "w-fit")}>
          <Plus className="h-4 w-4" /> New batch
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="panel divide-y divide-line/70" aria-label="Batches">
          {figs.map(({ b, f }, i) => (
            <motion.li
              key={b.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE.out, delay: Math.min(i, 6) * 0.04 }}
            >
              <Link href={`/batches/${b.id}`} className="group grid grid-cols-[auto_1fr] items-center gap-4 p-4 transition-colors hover:bg-surface-2/50 md:grid-cols-[auto_1fr_auto_auto] md:gap-6 md:px-5">
                <Flacon size="sm" level={f.units ? f.left / f.units : 0} inProfit={f.inProfit} label={`${f.left} of ${f.units} left`} />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="t2 truncate transition-colors group-hover:text-oud">{b.name}</span>
                  <span className="b2 num text-ink-2">
                    {shortDate(b.purchasedOn)}, {plain(f.left)} of {plain(f.units)} left
                  </span>
                </div>
                <div className="col-span-2 flex items-baseline justify-between gap-6 md:col-span-1 md:flex-col md:items-end md:gap-1">
                  <span className="b2 text-ink-2">Profit so far</span>
                  <span className={cn("figure text-[1.25rem]", realizedTone(f.realizedProfitAed, f.revenueAed, f.left))}>{aed0(f.realizedProfitAed)}</span>
                </div>
                <div className="col-span-2 flex items-baseline justify-between gap-6 md:col-span-1 md:w-36 md:flex-col md:items-end md:gap-1">
                  <span className="b2 text-ink-2">If all sells</span>
                  <span className="num t3">
                    {aed0(f.projectedProfitAed)} <span className="font-normal text-ink-2">({percent(f.projectedMarginPct)})</span>
                  </span>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>

        <aside className="flex flex-col gap-3">
          <h2 className="t2">Running low</h2>
          {low.length ? (
            <ul className="panel divide-y divide-line/70">
              {low.map(({ b, it, f }) => (
                <li key={it.id}>
                  <Link href={`/batches/${b.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="t3 truncate">{it.name}</span>
                      <span className="b2 truncate text-ink-2">{b.name}</span>
                    </span>
                    <span className="b2 num shrink-0 rounded-full bg-rose/10 px-2 py-1 text-rose">{f.left} left</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="body2 text-ink-2">Perfumes that are nearly sold out show up here, so you know what to restock.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
