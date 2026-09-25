"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PackagePlus, Pencil, Search, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { Collapse } from "@/components/elements/Collapse";
import { marginTone } from "@/components/elements/Delta";
import { ItemForm } from "@/components/inventory/ItemForm";
import { SaleForm } from "@/components/inventory/SaleForm";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { EASE } from "@/lib/animation";
import { addItem, recordSale, removeItem, updateItem } from "@/lib/batch-ops";
import { itemFigures } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { money, percent, plural } from "@/lib/format";
import type { Batch, BatchItem } from "@/typings/inventory";

export type Commit = (next: Batch, message: string, opts?: { undo?: boolean }) => void;

type Open = { id: string; mode: "sell" | "edit" } | null;

const LeftMeter = ({ left, qty }: { left: number; qty: number }) => (
  <div className="flex items-center gap-2.5">
    <span className="num t3 w-12 text-end">
      {left}
      <span className="font-normal text-ink-2">/{qty}</span>
    </span>
    <span className="relative hidden h-1.5 w-14 overflow-hidden rounded-full bg-surface-2 lg:block" aria-hidden>
      <motion.span
        className={cn("absolute inset-y-0 start-0 rounded-full", left === 0 ? "bg-ink-2/30" : left / qty <= 0.25 ? "bg-rose" : "bg-oud/70")}
        initial={false}
        animate={{ width: `${qty ? (left / qty) * 100 : 0}%` }}
        transition={{ duration: 0.5, ease: EASE.out }}
      />
    </span>
  </div>
);

const SoldChip = ({ flash }: { flash: { qty: number; key: number } | null }) => {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {flash && (
        <motion.span
          key={flash.key}
          initial={{ opacity: 0, y: reduce ? 0 : 4 }}
          animate={{ opacity: [0, 1, 1, 0], y: reduce ? 0 : -14 }}
          transition={{ duration: 1.2, ease: EASE.out, times: [0, 0.15, 0.7, 1] }}
          className="b2 num pointer-events-none absolute -top-1 end-0 rounded-full bg-amber px-1.5 py-1 text-paper"
          aria-hidden
        >
          −{flash.qty}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

export const StockTable = ({ batch, commit }: { batch: Batch; commit: Commit }) => {
  const [open, setOpen] = useState<Open>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<{ id: string; qty: number; key: number } | null>(null);
  const reduce = useReducedMotion();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return batch.items
      .map((it) => ({ it, f: itemFigures(batch, it) }))
      .filter(({ it }) => !q || `${it.brand} ${it.name}`.toLowerCase().includes(q));
  }, [batch, query]);

  const toggle = (id: string, mode: "sell" | "edit") => {
    setAdding(false);
    setOpen((o) => (o?.id === id && o.mode === mode ? null : { id, mode }));
  };

  const onSale = (item: BatchItem) => (sale: Parameters<typeof recordSale>[1]) => {
    commit(recordSale(batch, sale), `Recorded ${plural(sale.qty, "bottle")} of ${item.name}.`, { undo: true });
    setFlash({ id: item.id, qty: sale.qty, key: Date.now() });
    setOpen(null);
  };

  const onEdit = (item: BatchItem) => (patch: Omit<BatchItem, "id">) => {
    commit(updateItem(batch, item.id, patch), `Saved ${patch.name}.`);
    setOpen(null);
  };

  const onDelete = (item: BatchItem) => {
    commit(removeItem(batch, item.id), `Removed ${item.name}.`, { undo: true });
    setOpen(null);
  };

  const actions = (it: BatchItem, left: number) => (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant={open?.id === it.id && open.mode === "sell" ? "secondary" : "outline"} disabled={left === 0} onClick={() => toggle(it.id, "sell")} aria-expanded={open?.id === it.id && open.mode === "sell"}>
        {left === 0 ? "Sold out" : "Sell"}
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label={`Edit ${it.name}`} onClick={() => toggle(it.id, "edit")}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${it.name}`} onClick={() => onDelete(it)} className="hover:text-rose">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const panel = (it: BatchItem, sold: number) =>
    open?.id === it.id ? (
      open.mode === "sell" ? (
        <SaleForm batch={batch} item={it} onSubmit={onSale(it)} onCancel={() => setOpen(null)} />
      ) : (
        <ItemForm batch={batch} initial={it} submitLabel="Save perfume" minQty={sold} onSubmit={onEdit(it)} onCancel={() => setOpen(null)} />
      )
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      {batch.items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search perfumes</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand or perfume" className={cn(inputClass, "rounded-full ps-9")} />
          </label>
          <Button variant="secondary" onClick={() => { setOpen(null); setAdding((a) => !a); }} aria-expanded={adding}>
            <PackagePlus className="h-4 w-4" /> Add perfume
          </Button>
        </div>
      )}

      <Collapse open={adding}>
        <ItemForm
          batch={batch}
          submitLabel="Add to batch"
          onCancel={() => setAdding(false)}
          onSubmit={(item) => {
            commit(addItem(batch, item), `Added ${plural(item.qty, "bottle")} of ${item.name}.`);
            setAdding(false);
          }}
        />
      </Collapse>

      {batch.items.length === 0 && !adding && (
        <div className="panel flex flex-col items-start gap-4 p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <h3 className="t1">Add the perfumes in this batch</h3>
            <p className="body2 max-w-prose text-ink-2">Each perfume needs its retail price in pesos, what a bottle cost in dirhams, and how many bottles came in. Margins work out as you type.</p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <PackagePlus className="h-4 w-4" /> Add first perfume
          </Button>
        </div>
      )}

      {batch.items.length > 0 && rows.length === 0 && (
        <p className="body2 panel p-6 text-ink-2">No perfume matches “{query}”. Check the spelling or clear the search.</p>
      )}

      {/* Desktop table */}
      {rows.length > 0 && (
        <div className="panel hidden overflow-x-auto md:block">
          <table className="w-full min-w-[56rem] border-collapse">
            <thead>
              <tr className="b2 border-b border-line text-ink-2 [&>th]:h-11 [&>th]:px-4 [&>th]:text-start [&>th]:font-medium">
                <th>Perfume</th>
                <th className="!text-end">Retail</th>
                <th className="!text-end">Less com</th>
                <th className="!text-end">Cost</th>
                <th className="!text-end">Margin</th>
                <th className="!text-end">Left</th>
                <th className="!text-end">Projected sales</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map(({ it, f }) => (
                  <Fragment key={it.id}>
                    <motion.tr
                      layout={!reduce}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: f.left === 0 ? 0.6 : 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE.out }}
                      className={cn("body2 num border-b border-line/70 transition-colors hover:bg-surface-2/50 [&>td]:px-4 [&>td]:py-3", open?.id === it.id && "bg-surface-2/50")}
                    >
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="t3">{it.name}</span>
                          <span className="b2 text-ink-2">{it.brand || "No brand"}</span>
                        </div>
                      </td>
                      <td className="text-end">{money(it.retailPhp, "PHP")}</td>
                      <td className="text-end">{money(f.netPhp, "PHP")}</td>
                      <td className="text-end">
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{money(it.costAed, "AED")}</span>
                          <span className="b2 text-ink-2">{money(f.costPhp, "PHP")}</span>
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={cn("font-semibold", marginTone(f.marginPhp))}>{money(f.marginPhp, "PHP")}</span>
                          <span className="b2 text-ink-2">{percent(f.marginPct)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="relative flex justify-end">
                          <LeftMeter left={f.left} qty={it.qty} />
                          <SoldChip flash={flash?.id === it.id ? flash : null} />
                        </div>
                      </td>
                      <td className="text-end">{money(f.lineSalesPhp, "PHP")}</td>
                      <td className="w-px whitespace-nowrap">{actions(it, f.left)}</td>
                    </motion.tr>
                    <tr>
                      <td colSpan={8} className="p-0">
                        <Collapse open={open?.id === it.id}>
                          <div className="border-b border-line/70 bg-surface-2/30 p-3">{panel(it, f.sold)}</div>
                        </Collapse>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile list */}
      {rows.length > 0 && (
        <ul className="panel divide-y divide-line/70 md:hidden">
          <AnimatePresence initial={false}>
            {rows.map(({ it, f }) => (
              <motion.li key={it.id} layout={!reduce} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 p-4">
                <div className={cn("flex items-start justify-between gap-3", f.left === 0 && "opacity-60")}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="t3">{it.name}</span>
                    <span className="b2 text-ink-2">{it.brand || "No brand"}</span>
                  </div>
                  <div className="relative">
                    <LeftMeter left={f.left} qty={it.qty} />
                    <SoldChip flash={flash?.id === it.id ? flash : null} />
                  </div>
                </div>
                <div className="body2 num flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-ink-2">
                  <span>
                    {money(f.netPhp, "PHP")} net, cost {money(f.costPhp, "PHP")}
                  </span>
                  <span className={cn("font-semibold", marginTone(f.marginPhp))}>
                    {money(f.marginPhp, "PHP", { signed: true })} ({percent(f.marginPct)})
                  </span>
                </div>
                {actions(it, f.left)}
                <Collapse open={open?.id === it.id}>{panel(it, f.sold)}</Collapse>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};
