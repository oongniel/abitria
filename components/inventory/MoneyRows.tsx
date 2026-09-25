"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { EASE } from "@/lib/animation";

export interface MoneyRow {
  id: string;
  label: string;
  amount: string;
}

/** Editable name + amount list — used for partners (capital) and batch expenses. */
export const MoneyRows = ({
  rows,
  onChange,
  labelName,
  amountName,
  addLabel,
  placeholder,
  newId,
}: {
  rows: MoneyRow[];
  onChange: (rows: MoneyRow[]) => void;
  labelName: string;
  amountName: string;
  addLabel: string;
  placeholder: string;
  newId: () => string;
}) => {
  const reduce = useReducedMotion();
  const set = (id: string, patch: Partial<MoneyRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {rows.map((r, i) => (
          <motion.div
            key={r.id}
            layout={!reduce}
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="flex items-end gap-2 pb-1">
              <Field className="flex-1" label={labelName} hideLabel={i > 0} value={r.label} placeholder={placeholder} onChange={(e) => set(r.id, { label: e.target.value })} />
              <Field className="w-36" label={amountName} hideLabel={i > 0} unit="AED" type="number" inputMode="decimal" min={0} value={r.amount} onChange={(e) => set(r.id, { amount: e.target.value })} />
              <Button size="icon" variant="ghost" aria-label={`Remove ${r.label || "row"}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange([...rows, { id: newId(), label: "", amount: "" }])}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
};

export const toMoneyRows = <T extends { id: string }>(xs: T[], label: (x: T) => string, amount: (x: T) => number): MoneyRow[] =>
  xs.map((x) => ({ id: x.id, label: label(x), amount: String(amount(x)) }));

export const cleanRows = (rows: MoneyRow[]) =>
  rows.filter((r) => r.label.trim() || Number(r.amount) > 0).map((r) => ({ id: r.id, label: r.label.trim() || "Unnamed", amount: Number(r.amount) || 0 }));
