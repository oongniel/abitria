import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ItemForm } from "@/components/inventory/ItemForm";
import sample from "@/content/sample-batch.json";
import { newBatch } from "@/lib/batch-ops";

const batch = newBatch(sample);

describe("ItemForm", () => {
  it("previews the margin live and submits a valid perfume", () => {
    const onSubmit = vi.fn();
    render(<ItemForm batch={batch} submitLabel="Add to batch" onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Perfume"), { target: { value: "Lion" } });
    fireEvent.change(screen.getByLabelText("Retail price"), { target: { value: "1850" } });
    fireEvent.change(screen.getByLabelText("Cost per bottle"), { target: { value: "49" } });
    expect(screen.getByText(/717 a bottle/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to batch" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Lion", retailPhp: 1850, costAed: 49, qty: 6 }));
  });

  it("blocks submit and explains what's missing", () => {
    const onSubmit = vi.fn();
    render(<ItemForm batch={batch} submitLabel="Add to batch" onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to batch" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Add the perfume’s name.")).toBeInTheDocument();
  });
});
