"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

import { EASE } from "@/lib/animation";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";
const KEY = "sillage:theme";

const apply = (t: Theme) => {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
};

/** Inline in <head> so the first paint already has the right theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`;

export const ThemeToggle = ({ className }: { className?: string }) => {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      apply(next);
      setTheme(next);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const root = document.documentElement.style;
    root.setProperty("--vt-x", `${x}px`);
    root.setProperty("--vt-y", `${y}px`);
    root.setProperty("--vt-r", `${radius}px`);
    doc.startViewTransition(() => {
      flushSync(() => {
        apply(next);
        setTheme(next);
      });
    });
  };

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn("relative grid h-10 w-10 place-items-center overflow-hidden rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", className)}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={theme ?? "none"}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.26, ease: EASE.out }}
        >
          {theme === "dark" ? <Moon className="h-[1.125rem] w-[1.125rem]" /> : <Sun className="h-[1.125rem] w-[1.125rem]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};
