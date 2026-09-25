"use client";

import { motion } from "framer-motion";
import { useId } from "react";

import { SPRING } from "@/lib/animation";
import { cn } from "@/lib/cn";

interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({ value, onChange, tabs, label }: { value: T; onChange: (v: T) => void; tabs: Tab<T>[]; label: string }) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "b1 relative flex h-11 items-center gap-2 px-3 transition-colors duration-200",
              active ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("b2 num rounded-full px-1.5 py-1 transition-colors", active ? "bg-oud-soft text-oud" : "bg-surface-2 text-ink-2")}>
                {t.count}
              </span>
            )}
            {active && (
              <motion.span layoutId={`tab-${id}`} transition={SPRING.snappy} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-oud" />
            )}
          </button>
        );
      })}
    </div>
  );
}
