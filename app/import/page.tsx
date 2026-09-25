"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { EASE } from "@/lib/animation";
import { newBatch } from "@/lib/batch-ops";
import { batchFigures, itemFigures } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { money, percent, plural } from "@/lib/format";
import type { ParsedSheet } from "@/lib/spreadsheet";
import { useInventory } from "@/lib/store";

export default function ImportPage() {
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { upsert } = useInventory();
  const toast = useToast();
  const router = useRouter();
  const reduce = useReducedMotion();

  const read = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { parseWorkbook } = await import("@/lib/spreadsheet");
      setParsed(parseWorkbook(await file.arrayBuffer(), file.name));
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "That file couldn’t be read. Save it as .xlsx and try again.");
    } finally {
      setBusy(false);
    }
  };

  const preview = useMemo(() => (parsed ? newBatch(parsed) : null), [parsed]);
  const f = useMemo(() => (preview ? batchFigures(preview) : null), [preview]);

  return (
    <div className="container-x flex max-w-5xl flex-col gap-8 py-6 md:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="h1">Import a spreadsheet</h1>
        <p className="body1 max-w-prose text-ink-2">
          Drop in a stock sheet in the usual format (Brand, retail price, less com, Perfume Name, cost, cost ph, Stock). Commission, exchange rate and partner capital are picked up from it.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void read(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-[border-color,background-color,transform] duration-200 ease-out",
          drag ? "scale-[1.01] border-oud bg-oud-soft/60" : "border-line bg-surface hover:border-ink-2/40",
        )}
      >
        <motion.span animate={drag && !reduce ? { y: -4 } : { y: 0 }} transition={{ duration: 0.2, ease: EASE.out }} className="grid h-12 w-12 place-items-center rounded-full bg-oud-soft text-oud">
          <UploadCloud className="h-5 w-5" />
        </motion.span>
        <span className="t2">{busy ? "Reading…" : drag ? "Drop to read it" : "Choose a file or drop it here"}</span>
        <span className="body2 text-ink-2">.xlsx, .xls or .csv. It stays on this device.</span>
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => void read(e.target.files?.[0])} />
      </label>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert" className="body2 flex items-start gap-2 rounded-xl bg-rose/10 p-4 text-rose">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {parsed && preview && f && (
          <motion.section
            key={parsed.name + parsed.items.length}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE.out }}
            className="flex flex-col gap-5"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-oud" />
              <h2 className="t1">
                Found {plural(parsed.items.length, "perfume")}, {plural(f.units, "bottle")}
              </h2>
            </div>

            <div className="panel grid gap-4 p-5 sm:grid-cols-[1fr_9rem_9rem]">
              <Field label="Batch name" value={parsed.name} onChange={(e) => setParsed({ ...parsed, name: e.target.value })} />
              <Field label="Exchange rate" unit="PHP" type="number" value={String(parsed.rateAedToPhp)} onChange={(e) => setParsed({ ...parsed, rateAedToPhp: Number(e.target.value) || 0 })} />
              <Field label="Commission" unit="PHP" type="number" value={String(parsed.commissionPhp)} onChange={(e) => setParsed({ ...parsed, commissionPhp: Number(e.target.value) || 0 })} />
              <p className="body2 num text-ink-2 sm:col-span-3">
                Cost {money(f.goodsCostAed, "AED")}. If everything sells: {money(f.projectedSalesPhp, "PHP")} ({money(f.projectedSalesAed, "AED", { decimals: 0 })}), profit{" "}
                <span className="font-semibold text-amber">{money(f.projectedProfitAed, "AED", { decimals: 0 })}</span>.
                {parsed.partners.length > 0 && <> Partners: {parsed.partners.map((p) => `${p.name} (${money(p.capitalAed, "AED")})`).join(", ")}.</>}
              </p>
            </div>

            {parsed.warnings.length > 0 && (
              <ul className="body2 flex flex-col gap-1 text-amber">
                {parsed.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}

            <div className="panel overflow-x-auto">
              <table className="body2 num w-full min-w-[40rem]">
                <thead>
                  <tr className="b2 border-b border-line text-ink-2 [&>th]:h-10 [&>th]:px-4 [&>th]:text-start [&>th]:font-medium">
                    <th>Perfume</th>
                    <th className="!text-end">Retail</th>
                    <th className="!text-end">Cost</th>
                    <th className="!text-end">Stock</th>
                    <th className="!text-end">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((it) => {
                    const fi = itemFigures(preview, it);
                    return (
                      <tr key={it.id} className="border-b border-line/60 last:border-0 [&>td]:px-4 [&>td]:py-2.5">
                        <td>
                          <span className="font-medium">{it.name}</span> <span className="text-ink-2">{it.brand}</span>
                        </td>
                        <td className="text-end">{money(it.retailPhp, "PHP")}</td>
                        <td className="text-end">{money(it.costAed, "AED")}</td>
                        <td className="text-end">{it.qty}</td>
                        <td className="text-end">{percent(fi.marginPct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => { setParsed(null); if (input.current) input.current.value = ""; }}>
                Choose another file
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  upsert(preview);
                  toast(`Imported “${preview.name}”.`);
                  router.push(`/batches/${preview.id}`);
                }}
              >
                Create batch
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
