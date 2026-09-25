"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Copy, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import { PageSkeleton } from "@/components/elements/Skeleton";
import { BatchHeader } from "@/components/inventory/BatchHeader";
import { BatchSettingsForm } from "@/components/inventory/BatchSettingsForm";
import { toMoneyRows } from "@/components/inventory/MoneyRows";
import { SalesList } from "@/components/inventory/SalesList";
import { StockTable, type Commit } from "@/components/inventory/StockTable";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { EASE } from "@/lib/animation";
import { restockFrom, updateSettings } from "@/lib/batch-ops";
import { batchFigures } from "@/lib/calc";
import { useInventory } from "@/lib/store";

type Tab = "stock" | "sales" | "setup";

function BatchPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { ready, getBatch, upsert, remove, mode, isSeller } = useInventory();
  const toast = useToast();
  const reduce = useReducedMotion();
  const requested = (search.get("tab") as Tab) || "stock";
  const [tab, setTab] = useState<Tab>(isSeller && requested === "setup" ? "stock" : requested);
  const batch = getBatch(id);

  const commit = useCallback<Commit>(
    (next, message, opts) => {
      const prev = getBatch(next.id);
      upsert(next);
      toast(message, opts?.undo && prev ? { undo: () => upsert(prev) } : undefined);
    },
    [getBatch, upsert, toast],
  );

  if (!ready) return <PageSkeleton />;
  if (!batch) {
    return (
      <div className="container-x flex flex-col items-start gap-4 py-16">
        <h1 className="h2">{mode === "sheets" ? "This batch isn’t in the sheet" : "This batch isn’t on this device"}</h1>
        <p className="body1 max-w-prose text-ink-2">
          {mode === "sheets"
            ? "It may have been deleted, here or directly in Google Sheets."
            : "It may have been deleted, or it was created in another browser. Batches are saved per device until you restore a backup."}
        </p>
        <Link href="/" className="b1 text-oud underline underline-offset-4">
          Back to batches
        </Link>
      </div>
    );
  }

  const f = batchFigures(batch);

  const onRestock = () => {
    const copy = restockFrom(batch, `${batch.name} restock`);
    upsert(copy);
    toast(`Created “${copy.name}” with the same perfumes. Adjust costs and quantities as needed.`);
    router.push(`/batches/${copy.id}?tab=setup`);
  };

  const onDelete = () => {
    const snapshot = batch;
    remove(batch.id);
    toast(`Deleted “${snapshot.name}”.`, { undo: () => upsert(snapshot) });
    router.push("/");
  };

  const onExport = async () => {
    const { exportBatchWorkbook } = await import("@/lib/spreadsheet");
    exportBatchWorkbook(batch);
  };

  return (
    <div className="container-x flex flex-col gap-8 py-6 md:py-10">
      <Link href="/" className="b2 flex w-fit items-center gap-1.5 text-ink-2 transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All batches
      </Link>

      <BatchHeader
        batch={batch}
        f={f}
        actions={
          isSeller ? null : (
            <>
              <Button variant="outline" size="sm" onClick={onExport} disabled={!batch.items.length}>
                <Download className="h-4 w-4" /> Export .xlsx
              </Button>
              <Button variant="outline" size="sm" onClick={onRestock} disabled={!batch.items.length}>
                <Copy className="h-4 w-4" /> Restock
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-col gap-5">
        <Tabs
          label="Batch sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "stock", label: "Stock", count: batch.items.length },
            { value: "sales", label: "Sales", count: batch.sales.length },
            ...(isSeller ? [] : [{ value: "setup" as const, label: "Setup" }]),
          ]}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.22, ease: EASE.out }}
          >
            {tab === "stock" && <StockTable batch={batch} commit={commit} />}
            {tab === "sales" && <SalesList batch={batch} commit={commit} onGoToStock={() => setTab("stock")} />}
            {tab === "setup" && !isSeller && (
              <BatchSettingsForm
                key={batch.updatedAt}
                submitLabel="Save changes"
                initial={{
                  name: batch.name,
                  purchasedOn: batch.purchasedOn,
                  rateAedToPhp: batch.rateAedToPhp,
                  commissionPhp: batch.commissionPhp,
                  partners: toMoneyRows(batch.partners, (p) => p.name, (p) => p.capitalAed),
                  expenses: toMoneyRows(batch.expenses, (e) => e.label, (e) => e.amountAed),
                  notes: batch.notes,
                }}
                onSubmit={(v) => commit(updateSettings(batch, v), "Batch saved.")}
                aside={
                  <Button variant="danger" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" /> Delete batch
                  </Button>
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BatchPage />
    </Suspense>
  );
}
