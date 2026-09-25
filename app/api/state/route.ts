import { adminOnly, forbidden, handle, json } from "@/lib/server/http";
import { readSnapshot, replaceState } from "@/lib/server/repository";
import { redactForSeller } from "@/lib/server/seller";
import { isInventoryState } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Versions stay those of the stored batches, so a seller's saves still detect conflicts. */
export const GET = (req: Request) =>
  handle(req, async (role) => {
    const snapshot = await readSnapshot();
    return json({ ...snapshot, state: role === "seller" ? redactForSeller(snapshot.state) : snapshot.state, role });
  });

/** Replace everything — backup restore and "clear all". */
export const PUT = (req: Request) =>
  handle(req, async (role) => {
    if (!adminOnly(role)) return forbidden("Only the owner can restore or clear the data.");
    const body: unknown = await req.json();
    if (!isInventoryState(body)) return json({ error: "invalid", message: "That isn’t an Abitria backup." }, 400);
    return json({ ...(await replaceState(body)), role });
  });
