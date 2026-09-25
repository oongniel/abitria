import { handle, json } from "@/lib/server/http";
import { deleteBatch, saveBatch } from "@/lib/server/repository";
import type { Batch } from "@/typings/inventory";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const isBatch = (b: unknown, id: string): b is Batch =>
  typeof b === "object" && b !== null && (b as Batch).id === id && Array.isArray((b as Batch).items) && Array.isArray((b as Batch).sales);

export const PUT = (req: Request, { params }: Ctx) =>
  handle(req, async () => {
    const { id } = await params;
    const body = (await req.json()) as { batch?: unknown; baseVersion?: string | null };
    if (!isBatch(body.batch, id)) return json({ error: "invalid", message: "Batch payload is malformed." }, 400);
    return json(await saveBatch(body.batch, body.baseVersion ?? null));
  });

export const DELETE = (req: Request, { params }: Ctx) =>
  handle(req, async () => {
    const { id } = await params;
    const base = new URL(req.url).searchParams.get("baseVersion");
    return json(await deleteBatch(id, base));
  });
