"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { PageSkeleton } from "@/components/elements/Skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { todayIso } from "@/lib/id";
import { emptyState, isInventoryState } from "@/lib/storage";
import { useInventory } from "@/lib/store";

const Row = ({ title, body, children }: { title: string; body: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-4 border-t border-line py-6 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex max-w-prose flex-col gap-1">
      <h2 className="t2">{title}</h2>
      <p className="body2 text-ink-2">{body}</p>
    </div>
    <div className="flex shrink-0 gap-2">{children}</div>
  </section>
);

export default function DataPage() {
  const { ready, batches, replaceAll, mode } = useInventory();
  const where = mode === "sheets" ? "the Google Sheet" : "this device";
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [armed, setArmed] = useState(false);

  if (!ready) return <PageSkeleton />;

  const current = { version: 1 as const, batches };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sillage-backup-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded.");
  };

  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed: unknown = JSON.parse(await f.text());
      if (!isInventoryState(parsed)) throw new Error();
      const before = current;
      replaceAll(parsed);
      toast(`Restored ${plural(parsed.batches.length, "batch", "batches")}.`, { undo: () => replaceAll(before) });
    } catch {
      toast("That isn’t a Sillage backup file. Pick the .json you downloaded from this page.", { tone: "error" });
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  return (
    <div className="container-x flex max-w-3xl flex-col gap-8 py-6 md:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="h1">Backup</h1>
        <p className="body1 max-w-prose text-ink-2">
          {mode === "sheets"
            ? "Everything is saved in your Google Sheet, so it’s the same on every device. A backup file is still a good safety net before big changes."
            : "Everything is saved in this browser. Download a backup regularly, and restore it to move your batches to another phone or laptop."}
        </p>
      </div>

      <div className="panel flex flex-col p-5 md:p-8">
        <Row title="Download a backup" body={`${plural(batches.length, "batch", "batches")}, including every sale, as one .json file.`}>
          <Button onClick={exportJson} disabled={!batches.length}>
            <Download className="h-4 w-4" /> Download backup
          </Button>
        </Row>
        <Row title="Restore from a backup" body={`Replaces everything in ${where} with the backup. You can undo right after.`}>
          <Button variant="outline" onClick={() => file.current?.click()}>
            <Upload className="h-4 w-4" /> Choose backup
          </Button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void restore(e.target.files?.[0])} />
        </Row>
        <Row title={mode === "sheets" ? "Clear the sheet" : "Clear this device"} body={`Removes all batches from ${where}. Download a backup first if you might need them.`}>
          <Button
            variant="danger"
            disabled={!batches.length}
            onClick={() => {
              if (!armed) {
                setArmed(true);
                window.setTimeout(() => setArmed(false), 4000);
                return;
              }
              const before = current;
              replaceAll(emptyState());
              setArmed(false);
              toast("All batches cleared.", { undo: () => replaceAll(before) });
            }}
          >
            <RotateCcw className="h-4 w-4" /> {armed ? "Tap again to clear" : "Clear all data"}
          </Button>
        </Row>
      </div>
    </div>
  );
}
