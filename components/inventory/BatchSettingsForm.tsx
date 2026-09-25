"use client";

import { useMemo, useState } from "react";

import { MoneyRows, cleanRows, type MoneyRow } from "@/components/inventory/MoneyRows";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { uid } from "@/lib/id";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import type { Expense, Partner } from "@/typings/inventory";

export interface BatchSettingsValues {
  name: string;
  purchasedOn: string;
  rateAedToPhp: number;
  commissionPhp: number;
  partners: Partner[];
  expenses: Expense[];
  notes?: string;
}

interface Props {
  initial: { name: string; purchasedOn: string; rateAedToPhp: number; commissionPhp: number; partners: MoneyRow[]; expenses: MoneyRow[]; notes?: string };
  submitLabel: string;
  onSubmit: (v: BatchSettingsValues) => void;
  /** Extra controls rendered beside the submit button */
  aside?: React.ReactNode;
}

const Section = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
  <section className="grid gap-4 border-t border-line py-6 first:border-t-0 first:pt-0 md:grid-cols-[16rem_1fr] md:gap-8">
    <div className="flex flex-col gap-1">
      <h3 className="t2">{title}</h3>
      <p className="body2 text-ink-2">{hint}</p>
    </div>
    <div className="flex min-w-0 flex-col gap-4">{children}</div>
  </section>
);

export const BatchSettingsForm = ({ initial, submitLabel, onSubmit, aside }: Props) => {
  const [name, setName] = useState(initial.name);
  const [date, setDate] = useState(initial.purchasedOn);
  const [rate, setRate] = useState(String(initial.rateAedToPhp));
  const [commission, setCommission] = useState(String(initial.commissionPhp));
  const [partners, setPartners] = useState<MoneyRow[]>(initial.partners);
  const [expenses, setExpenses] = useState<MoneyRow[]>(initial.expenses);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [touched, setTouched] = useState(false);

  const snapshot = JSON.stringify({ name, date, rate, commission, partners, expenses, notes });
  const initialSnap = useMemo(
    () => JSON.stringify({ name: initial.name, date: initial.purchasedOn, rate: String(initial.rateAedToPhp), commission: String(initial.commissionPhp), partners: initial.partners, expenses: initial.expenses, notes: initial.notes ?? "" }),
    [initial],
  );
  const dirty = snapshot !== initialSnap;

  const rateN = Number(rate);
  const comN = Number(commission);
  const errors = {
    name: !name.trim() ? "Give the batch a name you’ll recognise." : undefined,
    rate: !(rateN > 0) ? "Enter how many pesos one dirham buys." : undefined,
    commission: !(comN >= 0) || commission === "" ? "Enter the commission per bottle, or 0." : undefined,
  };
  const valid = !errors.name && !errors.rate && !errors.commission;
  const capital = cleanRows(partners).reduce((n, p) => n + p.amount, 0);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!valid) return;
        onSubmit({
          name: name.trim(),
          purchasedOn: date,
          rateAedToPhp: rateN,
          commissionPhp: comN,
          partners: cleanRows(partners).map((r) => ({ id: r.id, name: r.label, capitalAed: r.amount })),
          expenses: cleanRows(expenses).map((r) => ({ id: r.id, label: r.label, amountAed: r.amount })),
          notes: notes.trim() || undefined,
        });
      }}
      className="panel flex flex-col p-5 md:p-8"
    >
      <Section title="Batch" hint="A name and the day the stock was bought.">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} error={touched ? errors.name : undefined} placeholder="October restock" />
          <Field label="Bought on" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </Section>

      <Section title="Pricing" hint="Used for every perfume in this batch. Changing them updates all margins.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Exchange rate" unit="PHP" type="number" inputMode="decimal" step="0.01" min={0} value={rate} onChange={(e) => setRate(e.target.value)} hint="Pesos for 1 dirham." error={touched ? errors.rate : undefined} />
          <Field label="Reseller commission" unit="PHP" type="number" inputMode="decimal" min={0} value={commission} onChange={(e) => setCommission(e.target.value)} hint="Taken off retail for each bottle sold." error={touched ? errors.commission : undefined} />
        </div>
      </Section>

      <Section title="Partners" hint="Who put money in. Profit is split by each partner’s share of the capital.">
        <MoneyRows rows={partners} onChange={setPartners} labelName="Partner" amountName="Capital" addLabel="Add partner" placeholder="Name" newId={() => uid("p_")} />
        {capital > 0 && <p className="b2 num text-ink-2">Capital in this batch: {money(capital, "AED")}</p>}
      </Section>

      <Section title="Other costs" hint="Shipping, excess baggage, packaging. Counted against profit, not tied to one perfume.">
        <MoneyRows rows={expenses} onChange={setExpenses} labelName="Cost" amountName="Amount" addLabel="Add cost" placeholder="Shipping to Manila" newId={() => uid("e_")} />
      </Section>

      <Section title="Notes" hint="Anything worth remembering about this batch.">
        <label className="sr-only" htmlFor="batch-notes">
          Notes
        </label>
        <textarea id="batch-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={cn(inputClass, "h-auto py-2.5")} placeholder="Supplier, flight, who’s holding the stock" />
      </Section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>{aside}</div>
        <Button type="submit" size="lg" disabled={!dirty && submitLabel.startsWith("Save")}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
