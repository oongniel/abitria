import { handle, json } from "@/lib/server/http";
import { readSnapshot, replaceState } from "@/lib/server/repository";
import { isInventoryState } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle(req, async () => json(await readSnapshot()));

/** Replace everything — backup restore and "clear all". */
export const PUT = (req: Request) =>
  handle(req, async () => {
    const body: unknown = await req.json();
    if (!isInventoryState(body)) return json({ error: "invalid", message: "That isn’t a Sillage backup." }, 400);
    return json(await replaceState(body));
  });
