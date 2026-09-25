"use client";

import { useId, useState } from "react";

import { marginTone } from "@/components/elements/Delta";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";
import { money, percent } from "@/lib/format";
import type { Batch, BatchItem } from "@/typings/inventory";

type Draft = { brand: string; name: string; retailPhp: string; costAed: string; qty: number };

interface ItemFormProps {
  batch: Batch;
  initial?: BatchItem;
  submitLabel: string;
  onSubmit: (item: Omit<BatchItem, "id">) => void;
  onCancel: () => void;
  /** Minimum quantity allowed (bottles already sold) */
  minQty?: number;
}

export const ItemForm = ({ batch, initial, submitLabel, onSubmit, onCancel, minQty = 1 }: ItemFormProps) => {
  const listId = useId();
  const [d, setD] = useState<Draft>({
    brand: initial?.brand ?? "",
    name: initial?.name ?? "",
    retailPhp: initial ? String(initial.retailPhp) : "",
    costAed: initial ? String(initial.costAed) : "",
    qty: initial?.qty ?? 6,
  });
  const [touched, setTouched] = useState(false);

  const retail = Number(d.retailPhp);
  const cost = Number(d.costAed);
  const errors = {
    name: !d.name.trim() ? "Add the perfume’s name." : undefined,
    retailPhp: !(retail > 0) ? "Enter the retail price in pesos." : undefined,
    costAed: !(cost >= 0) || d.costAed === "" ? "Enter what one bottle cost in dirhams." : undefined,
  };
  const valid = !errors.name && !errors.retailPhp && !errors.costAed;

  const net = retail - batch.commissionPhp;
  const costPhp = cost * batch.rateAedToPhp;
  const margin = net - costPhp;
  const brands = [...new Set(batch.items.map((i) => i.brand).filter(Boolean))];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit({ brand: d.brand.trim(), name: d.name.trim(), retailPhp: retail, costAed: cost, qty: d.qty });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-2/50 p-4 md:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_0.8fr_0.8fr_auto]">
        <Field label="Brand" list={listId} value={d.brand} onChange={(e) => setD({ ...d, brand: e.target.value })} placeholder="Lattafa" autoComplete="off" />
        <datalist id={listId}>
          {brands.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
        <Field label="Perfume" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Khamrah" autoFocus={!initial} error={touched ? errors.name : undefined} autoComplete="off" />
        <Field label="Retail price" unit="PHP" inputMode="decimal" type="number" min={0} value={d.retailPhp} onChange={(e) => setD({ ...d, retailPhp: e.target.value })} placeholder="1850" error={touched ? errors.retailPhp : undefined} />
        <Field label="Cost per bottle" unit="AED" inputMode="decimal" type="number" min={0} step="0.01" value={d.costAed} onChange={(e) => setD({ ...d, costAed: e.target.value })} placeholder="49" error={touched ? errors.costAed : undefined} />
        <div className="flex flex-col gap-1.5">
          <span className="b2 text-ink-2">Bottles</span>
          <Stepper label="bottles" value={d.qty} min={Math.max(1, minQty)} onChange={(qty) => setD({ ...d, qty })} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="body2 num text-ink-2" aria-live="polite">
          {retail > 0 && d.costAed !== "" ? (
            <>
              Nets {money(net, "PHP")} after commission, costs {money(costPhp, "PHP")}.{" "}
              <span className={cn("font-semibold", marginTone(margin))}>
                {money(margin, "PHP", { signed: true })} a bottle ({percent(net > 0 ? margin / net : 0)})
              </span>
            </>
          ) : (
            <>Margin appears here as you type.</>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </div>
    </form>
  );
};
