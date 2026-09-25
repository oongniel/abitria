"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE } from "@/lib/animation";

/** Height reveal for inline panels (sale entry, edit, add). */
export const Collapse = ({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) => {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className={className}
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: 0.2, ease: EASE.out } }}
          transition={{ duration: DURATION.layout, ease: EASE.out }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
