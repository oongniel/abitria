import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY } from "@/lib/storage";
import { InventoryProvider, useInventory } from "@/lib/store";

const Probe = () => {
  const { ready, batches } = useInventory();
  return <p>{ready ? batches.map((b) => `${b.name}:${b.items.length}`).join(",") || "empty" : "loading"}</p>;
};

describe("default batch", () => {
  beforeEach(() => localStorage.clear());

  it("seeds the new stock sheet on first open", async () => {
    render(<InventoryProvider><Probe /></InventoryProvider>);
    expect(await screen.findByText("New stock:13")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Liquid Brun");
  });

  it("does not re-seed after the owner clears their data", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, batches: [] }));
    render(<InventoryProvider><Probe /></InventoryProvider>);
    expect(await screen.findByText("empty")).toBeInTheDocument();
  });
});
