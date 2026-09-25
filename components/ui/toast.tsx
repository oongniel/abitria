"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Undo2, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

import { EASE } from "@/lib/animation";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "neutral" | "error";
  undo?: () => void;
}

interface ToastApi {
  toast: (message: string, opts?: { tone?: Toast["tone"]; undo?: () => void; duration?: number }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback<ToastApi["toast"]>(
    (message, opts) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone: opts?.tone ?? "success", undo: opts?.undo }]);
      window.setTimeout(() => dismiss(id), opts?.duration ?? (opts?.undo ? 6000 : 3200));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pe-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
              transition={{ duration: 0.32, ease: EASE.out }}
              className="pointer-events-auto flex min-h-12 w-full max-w-sm items-center gap-3 rounded-2xl bg-ink py-2 pe-2 ps-4 text-paper shadow-pop"
              role="status"
            >
              <span className={t.tone === "error" ? "text-rose" : "text-paper/70"}>
                {t.tone === "error" ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </span>
              <p className="body2 flex-1">{t.message}</p>
              {t.undo ? (
                <button
                  type="button"
                  onClick={() => {
                    t.undo?.();
                    dismiss(t.id);
                  }}
                  className="b2 flex h-8 items-center gap-1.5 rounded-full bg-paper/10 px-3 transition-colors hover:bg-paper/20"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </button>
              ) : (
                <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="grid h-8 w-8 place-items-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper">
                  <X className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
};
