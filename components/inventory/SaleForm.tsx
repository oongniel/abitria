"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { itemFigures } from "@/lib/calc";
import { money } from "@/lib/format";
import { todayIso } from "@/lib/id";
import type { Batch, BatchItem, Sale, SaleChannel } from "@/typings/inventory";

interface SaleFormProps {
  batch: Batch;
  item: BatchItem;
  onSubmit: (sale: Omit<Sale, "id">) => void;
  onCancel: () => void;
}

export const SaleForm = ({ batch, item, onSubmit, onCancel }: SaleFormProps) => {
  const f = itemFigures(batch, item);
  const [qty, setQty] = useState(1);
  const [channel, setChannel] = useState<SaleChannel>("reseller");
  const [price, setPrice] = useState(String(f.netPhp));
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");

  const pickChannel = (c: SaleChannel) => {
    setChannel(c);
    setPrice(String(c === "reseller" ? f.netPhp : item.retailPhp));
  };

  const unit = Number(price);
  const valid = unit >= 0 && price !== "" && qty >= 1 && qty <= f.left;

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
          <Stepper label="bottles sold" value={qty} min={1} max={Math.max(1, f.left)} onChange={setQty} />
        </div>
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
        <Field className="w-36" label="Received each" unit="PHP" type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
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
            Record sale
          </Button>
        </div>
      </div>
    </form>
  );
};
