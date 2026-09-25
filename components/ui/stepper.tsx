"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useRef } from "react";

import { EASE } from "@/lib/animation";

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}

export const Stepper = ({ value, onChange, min = 1, max = 999, label }: StepperProps) => {
  const reduce = useReducedMotion();
  const dir = useRef(1);
  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, v));
    dir.current = next >= value ? 1 : -1;
    onChange(next);
  };
  return (
    <div role="group" aria-label={label} className="inline-flex h-10 items-center rounded-full border border-line bg-surface p-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => set(value - 1)}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:scale-90 disabled:opacity-35"
      >
        <Minus className="h-4 w-4" strokeWidth={2} />
      </button>
      <div className="relative grid h-8 w-10 place-items-center overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={dir.current}>
          <motion.span
            key={value}
            className="t3 num"
            initial={reduce ? { opacity: 0 } : { y: dir.current * 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: dir.current * -14, opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE.out }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => set(value + 1)}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:scale-90 disabled:opacity-35"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
};
