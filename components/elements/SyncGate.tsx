"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CloudCheck, CloudOff, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { EASE } from "@/lib/animation";
import { cn } from "@/lib/cn";
import { useInventory } from "@/lib/store";

/** Shows where data lives and whether the last change reached it. */
export const SyncStatus = ({ className, compact }: { className?: string; compact?: boolean }) => {
  const { mode, status, statusMessage, retry, saveFailed } = useInventory();
  if (mode === "local") {
    return <p className={cn("b2 leading-snug text-ink-2", className)}>{saveFailed ? "Not saving on this device" : "Saved on this device"}</p>;
  }
  const icon =
    status === "saving" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : status === "error" ? <CloudOff className="h-3.5 w-3.5" /> : <CloudCheck className="h-3.5 w-3.5" />;
  const label = status === "saving" ? "Saving to Google Sheets" : status === "error" ? "Not saved yet" : "Saved to Google Sheets";
  if (compact) {
    return (
      <button type="button" onClick={status === "error" ? retry : undefined} title={statusMessage ?? label} aria-label={status === "error" ? `${label}. Try again` : label} className={cn("grid h-10 w-10 place-items-center rounded-full", status === "error" ? "text-rose" : "text-ink-2", className)}>
        {icon}
      </button>
    );
  }
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)} aria-live="polite">
      <p className={cn("b2 flex items-center gap-1.5 leading-snug", status === "error" ? "text-rose" : "text-ink-2")} title={statusMessage ?? undefined}>
        {icon} {label}
      </p>
      {status === "error" && (
        <button type="button" onClick={retry} className="b2 flex w-fit items-center gap-1 text-oud underline underline-offset-4">
          <RefreshCw className="h-3 w-3" /> Try again
        </button>
      )}
    </div>
  );
};

/** Relays store notices (e.g. conflicts) as toasts. */
export const SyncNotices = () => {
  const { notice } = useInventory();
  const toast = useToast();
  const last = useRef(0);
  useEffect(() => {
    if (notice && notice.id !== last.current) {
      last.current = notice.id;
      toast(notice.message, { tone: notice.tone === "error" ? "error" : "neutral", duration: 7000 });
    }
  }, [notice, toast]);
  return null;
};

const Screen = ({ children }: { children: React.ReactNode }) => {
  const reduce = useReducedMotion();
  return (
    <div className="container-x grid min-h-[calc(100dvh-10rem)] place-items-center py-10">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE.out }}
        className="panel flex w-full max-w-md flex-col gap-5 p-6 md:p-8"
      >
        {children}
      </motion.div>
    </div>
  );
};

const Unlock = () => {
  const { unlock } = useInventory();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-oud-soft text-oud">
        <KeyRound className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="h2">Enter the passcode</h1>
        <p className="body2 text-ink-2">Your batches are in Google Sheets. This device stays signed in for six months.</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!code.trim()) return setError("Enter the passcode.");
          setBusy(true);
          const ok = await unlock(code);
          setBusy(false);
          if (!ok) setError("That passcode didn’t match. Check it and try again.");
        }}
      >
        <Field label="Passcode" type="password" autoComplete="current-password" autoFocus value={code} onChange={(e) => { setCode(e.target.value); setError(undefined); }} error={error} />
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null} Unlock
        </Button>
      </form>
    </Screen>
  );
};

const LoadError = ({ message }: { message: string }) => {
  const { reload } = useInventory();
  return (
    <Screen>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="h2">Couldn’t open the spreadsheet</h1>
        <p className="body2 text-ink-2">{message}</p>
      </div>
      <Button onClick={reload} className="self-start">
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </Screen>
  );
};

/** Replaces the page with the passcode or setup-error screen when Sheets mode needs it. */
export const SyncGate = ({ children }: { children: React.ReactNode }) => {
  const { locked, loadError } = useInventory();
  if (locked) return <Unlock />;
  if (loadError) return <LoadError message={loadError} />;
  return <>{children}</>;
};
