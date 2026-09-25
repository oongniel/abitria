"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

import { DURATION, EASE } from "@/lib/animation";
import { cn } from "@/lib/cn";

interface FlaconProps {
  /** 0..1 — stock left */
  level: number;
  /** 0..1 — sell-through at which the batch breaks even; omit to hide the line */
  breakEvenAt?: number;
  inProfit?: boolean;
  size?: "sm" | "lg";
  className?: string;
  label: string;
}

// Geometry (viewBox 0 0 120 168)
const BODY = { x: 12, y: 50, w: 96, h: 110, r: 22 };
const INNER = { x: BODY.x + 5, y: BODY.y + 5, w: BODY.w - 10, h: BODY.h - 10, r: BODY.r - 5 };
const WAVE =
  "M0 6 Q 15 0 30 6 T 60 6 T 90 6 T 120 6 T 150 6 T 180 6 T 210 6 T 240 6 V 200 H 0 Z";

/**
 * The batch flacon: liquid is the stock left; the etched line is break-even.
 * Once the level drops past the line, the liquid turns amber — the batch is in profit.
 */
export const Flacon = ({ level, breakEvenAt, inProfit = false, size = "lg", className, label }: FlaconProps) => {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const clamped = Math.min(1, Math.max(0, level));
  const liquidTop = INNER.y + (1 - clamped) * INNER.h - 6;
  const lineY = breakEvenAt !== undefined ? INNER.y + breakEvenAt * INNER.h : null;
  const lg = size === "lg";

  return (
    <div className={cn("relative", lg ? "w-[7.5rem] md:w-[8.5rem]" : "w-9", className)}>
      <svg viewBox="0 0 120 168" role="img" aria-label={label} className="block h-auto w-full overflow-visible">
        <defs>
          <clipPath id={`clip-${id}`}>
            <rect x={INNER.x} y={INNER.y} width={INNER.w} height={INNER.h} rx={INNER.r} />
          </clipPath>
          <linearGradient id={`oud-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--liquid-a))" />
            <stop offset="1" stopColor="rgb(var(--liquid-b))" />
          </linearGradient>
          <linearGradient id={`gold-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--gold-a))" />
            <stop offset="1" stopColor="rgb(var(--gold-b))" />
          </linearGradient>
          <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgb(var(--surface))" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="rgb(var(--surface))" stopOpacity="0.35" />
            <stop offset="1" stopColor="rgb(var(--surface))" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* cap + neck */}
        <rect x="40" y="4" width="40" height="30" rx="7" className="fill-ink" />
        <rect x="44" y="8" width="6" height="22" rx="3" className="fill-paper" opacity="0.18" />
        <rect x="48" y="33" width="24" height="19" rx="3" className="fill-surface-2 stroke-line" strokeWidth="1.5" />

        {/* glass */}
        <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} fill={`url(#glass-${id})`} className="stroke-ink-2/40" strokeWidth="1.5" />

        {/* liquid */}
        <g clipPath={`url(#clip-${id})`}>
          <motion.g
            initial={reduce ? false : { y: INNER.y + INNER.h + 8 }}
            animate={{ y: liquidTop }}
            transition={reduce ? { duration: 0 } : { duration: DURATION.focal, ease: EASE.out }}
          >
            <g className="flacon-wave-back" opacity="0.45">
              <path d={WAVE} transform="translate(-4 2)" fill={inProfit ? `url(#gold-${id})` : `url(#oud-${id})`} />
            </g>
            <g className="flacon-wave">
              <motion.path d={WAVE} fill={`url(#oud-${id})`} initial={false} animate={{ opacity: inProfit ? 0 : 1 }} transition={{ duration: 0.6 }} />
              <motion.path d={WAVE} fill={`url(#gold-${id})`} initial={false} animate={{ opacity: inProfit ? 1 : 0 }} transition={{ duration: 0.6 }} />
            </g>
          </motion.g>
        </g>

        {/* break-even etching */}
        {lineY !== null && (
          <g className={lg ? undefined : "hidden"}>
            <line x1={BODY.x - 6} x2={BODY.x + BODY.w + 6} y1={lineY} y2={lineY} className="stroke-ink" strokeWidth="1.25" strokeDasharray="3 3" opacity="0.7" />
          </g>
        )}

        {/* sheen */}
        <path d={`M${BODY.x + 12} ${BODY.y + 18} Q ${BODY.x + 9} ${BODY.y + 55} ${BODY.x + 12} ${BODY.y + 92}`} className="stroke-surface" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.55" />
      </svg>
    </div>
  );
};

/** Vertical position (0..1 of flacon height) of the break-even line — for aligning an HTML label. */
export const breakEvenTop = (breakEvenAt: number) => (INNER.y + breakEvenAt * INNER.h) / 168;
