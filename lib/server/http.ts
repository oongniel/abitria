import { isAuthed } from "@/lib/server/auth";
import { ConflictError } from "@/lib/server/repository";
import { SheetsConfigError } from "@/lib/server/sheets-client";

export const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Wraps a route: passcode check, then maps repository errors to HTTP. */
export const handle = async (req: Request, fn: () => Promise<Response>): Promise<Response> => {
  if (!isAuthed(req)) return json({ error: "locked" }, 401);
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConflictError) return json({ error: "conflict", ...e.snapshot }, 409);
    if (e instanceof SheetsConfigError) return json({ error: "config", message: e.message }, 503);
    console.error(e);
    return json({ error: "sheets", message: e instanceof Error ? e.message : "Unknown error" }, 502);
  }
};
