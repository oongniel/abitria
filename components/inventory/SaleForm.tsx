"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { itemFigures } from "@/lib/calc";
import { money } from "@/lib/format";
import { todayIso } from "@/lib/id";
import { useInventory } from "@/lib/store";
import type { Batch, BatchItem, Sale, SaleChannel } from "@/typings/inventory";

interface SaleFormProps {
  batch: Batch;
  item: BatchItem;
  /** Pass a sale to edit it; omit to record a new one. */
  initial?: Sale;
  submitLabel?: string;
  onSubmit: (sale: Omit<Sale, "id" | "soldBy">) => void;
  onCancel: () => void;
}

export const SaleForm = ({ batch, item, initial, submitLabel = "Record sale", onSubmit, onCancel }: SaleFormProps) => {
  const f = itemFigures(batch, item);
  // A seller always sells through a reseller, at the reseller rate; the server enforces the same.
  const { isSeller } = useInventory();
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const [channel, setChannel] = useState<SaleChannel>(isSeller ? "reseller" : initial?.channel ?? "reseller");
  const [price, setPrice] = useState(String(isSeller ? f.netPhp : initial?.unitPricePhp ?? f.netPhp));
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [note, setNote] = useState(initial?.note ?? "");

  const pickChannel = (c: SaleChannel) => {
    setChannel(c);
    setPrice(String(c === "reseller" ? f.netPhp : item.retailPhp));
  };

  const unit = isSeller ? f.netPhp : Number(price);
  const max = f.left + (initial?.qty ?? 0);
  const valid = unit >= 0 && price !== "" && qty >= 1 && qty <= max;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({ itemId: item.id, qty, unitPricePhp: unit, channel, date, note: note.trim() || undefined });
      }}
      className="flex flex-col gap-4 rounded-2xl border border-oud/25 bg-oud-soft/40 p-4 md:p-5"
    >
      <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <span className="b2 text-ink-2">Bottles sold</span>
          <Stepper label="bottles sold" value={qty} min={1} max={Math.max(1, max)} onChange={setQty} />
        </div>
        {!isSeller && (
          <div className="flex flex-col gap-1.5">
            <span className="b2 text-ink-2">Sold through</span>
            <Segmented
              label="Sold through"
              value={channel}
              onChange={pickChannel}
              options={[
                { value: "reseller", label: "Reseller" },
                { value: "direct", label: "Direct" },
              ]}
            />
          </div>
        )}
        {isSeller ? (
          <div className="flex flex-col gap-1.5">
            <span className="b2 text-ink-2">Received each</span>
            <span className="num t2 leading-none">{money(f.netPhp, "PHP")}</span>
          </div>
        ) : (
          <Field className="w-36" label="Received each" unit="PHP" type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        )}
        <Field className="w-40" label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field className="min-w-40 flex-1" label="Note" placeholder="Customer or order ref" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="body2 num text-ink-2">
          {channel === "reseller" ? `Retail ${money(item.retailPhp, "PHP")} minus ${money(batch.commissionPhp, "PHP")} commission.` : "Sold directly — no commission."}{" "}
          <span className="font-semibold text-ink">Total {money(qty * (unit || 0), "PHP")}</span>
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
};
