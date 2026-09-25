import { adminOnly, forbidden, handle, json } from "@/lib/server/http";
import { deleteBatch, saveBatch, saveSellerSales } from "@/lib/server/repository";
import { redactForSeller } from "@/lib/server/seller";
import type { Batch } from "@/typings/inventory";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const isBatch = (b: unknown, id: string): b is Batch =>
  typeof b === "object" && b !== null && (b as Batch).id === id && Array.isArray((b as Batch).items) && Array.isArray((b as Batch).sales);

export const PUT = (req: Request, { params }: Ctx) =>
  handle(req, async (role) => {
    const { id } = await params;
    const body = (await req.json()) as { batch?: unknown; baseVersion?: string | null };
    if (!isBatch(body.batch, id)) return json({ error: "invalid", message: "Batch payload is malformed." }, 400);
    const base = body.baseVersion ?? null;
    if (role === "seller") {
      const snapshot = await saveSellerSales(id, body.batch.sales, base);
      return json({ ...snapshot, state: redactForSeller(snapshot.state), role });
    }
    return json({ ...(await saveBatch(body.batch, base)), role });
  });

export const DELETE = (req: Request, { params }: Ctx) =>
  handle(req, async (role) => {
    if (!adminOnly(role)) return forbidden("Only the owner can delete a batch.");
    const { id } = await params;
    const base = new URL(req.url).searchParams.get("baseVersion");
    return json({ ...(await deleteBatch(id, base)), role });
  });
