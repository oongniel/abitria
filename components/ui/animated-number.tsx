"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { EASE } from "@/lib/animation";

/** Ticks from the previous value to the new one — used on every headline figure. */
export const AnimatedNumber = ({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce || prev.current === value) {
      setShown(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: EASE.out,
      onUpdate: setShown,
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span className={className} aria-label={format(value)}>
      <span aria-hidden>{format(shown)}</span>
    </span>
  );
};
