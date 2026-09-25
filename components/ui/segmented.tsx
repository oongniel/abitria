"use client";

import { motion } from "framer-motion";
import { useId } from "react";

import { SPRING } from "@/lib/animation";
import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, label, size = "md", className }: SegmentedProps<T>) {
  const group = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full bg-surface-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 rounded-full px-3 transition-colors duration-200",
              size === "sm" ? "b2 h-7" : "b2 h-8",
              active ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                transition={SPRING.snappy}
                className="absolute inset-0 rounded-full bg-surface shadow-lift"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
