"use client";

import { motion } from "framer-motion";
import { Database, FileUp, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SyncGate, SyncNotices, SyncStatus } from "@/components/elements/SyncGate";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SPRING } from "@/lib/animation";
import { cn } from "@/lib/cn";
import { useInventory } from "@/lib/store";

const NAV = [
  { href: "/", label: "Batches", icon: LayoutGrid, match: (p: string) => p === "/" || (p.startsWith("/batches/") && p !== "/batches/new") },
  { href: "/batches/new", label: "New batch", icon: Plus, match: (p: string) => p === "/batches/new" },
  { href: "/import", label: "Import", icon: FileUp, match: (p: string) => p.startsWith("/import") },
  { href: "/data", label: "Backup", icon: Database, match: (p: string) => p.startsWith("/data") },
];

const Mark = () => (
  <svg viewBox="0 0 24 32" aria-hidden className="h-7 w-auto">
    <rect x="8" y="1" width="8" height="6" rx="1.5" className="fill-ink" />
    <rect x="9.5" y="7" width="5" height="3" className="fill-ink-2" />
    <rect x="2" y="10" width="20" height="21" rx="5" className="fill-none stroke-ink" strokeWidth="1.6" />
    <path d="M4.5 20 Q8 18.5 12 20 T19.5 20 V26 a3 3 0 0 1 -3 3 h-9 a3 3 0 0 1 -3 -3 Z" className="fill-oud" />
  </svg>
);

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { saveFailed, mode } = useInventory();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-e border-line bg-surface-2/60 px-4 py-6 md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <Mark />
          <span className="font-serif text-[1.375rem] font-medium tracking-[-0.02em]">Sillage</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("b1 relative flex h-10 items-center gap-3 rounded-xl px-3 transition-colors duration-200", active ? "text-ink" : "text-ink-2 hover:bg-surface hover:text-ink")}
              >
                {active && <motion.span layoutId="nav-active" transition={SPRING.snappy} className="absolute inset-0 rounded-xl bg-surface shadow-lift ring-1 ring-line" />}
                <Icon className={cn("relative h-[1.125rem] w-[1.125rem]", active && "text-oud")} strokeWidth={1.8} />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 px-1">
          <SyncStatus />
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-md md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Mark />
          <span className="font-serif text-[1.25rem] font-medium tracking-[-0.02em]">Sillage</span>
        </Link>
        <div className="flex items-center gap-2">
          {mode === "sheets" && <SyncStatus compact />}
          <ThemeToggle />
        </div>
      </header>

      <main className="min-w-0 pb-28 md:pb-16">
        <SyncNotices />
        {saveFailed && mode === "local" && (
          <div role="alert" className="body2 border-b border-rose/30 bg-rose/10 px-5 py-2 text-rose">
            Changes can’t be saved: this browser’s storage is full or blocked. Export a backup from the Backup page before closing.
          </div>
        )}
        <SyncGate>{children}</SyncGate>
      </main>

      {/* Mobile tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex h-16 flex-col items-center justify-center gap-1 transition-colors", active ? "text-oud" : "text-ink-2")}>
                  {active && <motion.span layoutId="tab-active" transition={SPRING.snappy} className="absolute top-0 h-0.5 w-8 rounded-full bg-oud" />}
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                  <span className="text-[0.6875rem] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
