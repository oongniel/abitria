import { cn } from "@/lib/cn";

/** Colours a figure by sign: amber for earned, rose for short. */
export const toneFor = (n: number) => (n > 0.005 ? "text-amber" : n < -0.005 ? "text-rose" : "text-ink");

/** Realized profit: short of break-even is normal while stock remains — only a sold-out batch below zero is a loss. */
export const realizedTone = (profit: number, revenue: number, left: number) =>
  revenue <= 0 ? "text-ink-2" : profit >= 0 ? "text-amber" : left === 0 ? "text-rose" : "text-ink";

/** Per-bottle margins: neutral when healthy, rose when a perfume loses money. */
export const marginTone = (n: number) => (n < 0 ? "text-rose" : "text-ink");

export const Delta = ({ value, children, className }: { value: number; children: React.ReactNode; className?: string }) => (
  <span className={cn(toneFor(value), className)}>{children}</span>
);
