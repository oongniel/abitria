"use client";

import Link from "next/link";

import { useInventory } from "@/lib/store";

/**
 * Hides an owner-only page from a seller who reaches it by URL. The server
 * refuses these changes anyway; this is so they meet a sentence, not an error.
 */
export const OwnerOnly = ({ children }: { children: React.ReactNode }) => {
  const { isSeller } = useInventory();
  if (!isSeller) return <>{children}</>;
  return (
    <div className="container-x flex flex-col items-start gap-4 py-16">
      <h1 className="h2">That’s the owner’s page</h1>
      <p className="body1 max-w-prose text-ink-2">You’re signed in to record sales. Batches, imports and backups are handled by the owner.</p>
      <Link href="/" className="b1 text-oud underline underline-offset-4">
        Back to batches
      </Link>
    </div>
  );
};
