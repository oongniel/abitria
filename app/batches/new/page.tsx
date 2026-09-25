"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageSkeleton } from "@/components/elements/Skeleton";
import { BatchSettingsForm } from "@/components/inventory/BatchSettingsForm";
import { toMoneyRows } from "@/components/inventory/MoneyRows";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { DEFAULTS, newBatch, restockFrom, updateSettings } from "@/lib/batch-ops";
import { plural } from "@/lib/format";
import { todayIso, uid } from "@/lib/id";
import { OwnerOnly } from "@/components/elements/OwnerOnly";
import { useInventory } from "@/lib/store";

function NewBatchPage() {
  const { ready, batches, upsert } = useInventory();
  const router = useRouter();
  const toast = useToast();
  const latest = batches[0];
  const [source, setSource] = useState<string>("blank");

  const initial = useMemo(() => {
    const month = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const base = latest ?? null;
    return {
      name: `${month} batch`,
      purchasedOn: todayIso(),
      rateAedToPhp: base?.rateAedToPhp ?? DEFAULTS.rateAedToPhp,
      commissionPhp: base?.commissionPhp ?? DEFAULTS.commissionPhp,
      partners: base?.partners.length
        ? toMoneyRows(base.partners, (p) => p.name, (p) => p.capitalAed)
        : [
            { id: uid("p_"), label: "", amount: "" },
            { id: uid("p_"), label: "", amount: "" },
          ],
      expenses: [],
    };
  }, [latest]);

  if (!ready) return <PageSkeleton />;
  const sourceBatch = batches.find((b) => b.id === source);

  return (
    <div className="container-x flex max-w-4xl flex-col gap-8 py-6 md:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="h1">New batch</h1>
        <p className="body1 max-w-prose text-ink-2">Set how this batch is priced and who funded it. You’ll add the perfumes on the next screen.</p>
      </div>

      {batches.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="b2 text-ink-2">Perfumes</span>
          <Segmented
            label="Start from"
            value={source === "blank" ? "blank" : "copy"}
            onChange={(v) => setSource(v === "blank" ? "blank" : (latest?.id ?? "blank"))}
            options={[
              { value: "blank", label: "Start empty" },
              { value: "copy", label: "Copy a previous batch" },
            ]}
            className="w-fit"
          />
          {source !== "blank" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label htmlFor="copy-from" className="body2 text-ink-2">
                Copy perfumes, prices and costs from
              </label>
              <select id="copy-from" value={source} onChange={(e) => setSource(e.target.value)} className="body2 h-9 rounded-full border border-line bg-surface px-3 text-ink">
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({plural(b.items.length, "perfume")})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <BatchSettingsForm
        initial={initial}
        submitLabel="Create batch"
        onSubmit={(v) => {
          const created = sourceBatch
            ? updateSettings(restockFrom(sourceBatch, v.name), { ...v })
            : { ...newBatch({ name: v.name }), ...v, id: uid("b_") };
          upsert(created);
          toast(`Created “${created.name}”.`);
          router.push(`/batches/${created.id}`);
        }}
      />
    </div>
  );
}

export default function Page() {
  return (
    <OwnerOnly>
      <NewBatchPage />
    </OwnerOnly>
  );
}
