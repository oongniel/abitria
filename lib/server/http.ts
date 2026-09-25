import { sessionRole } from "@/lib/server/auth";
import { ConflictError, ForbiddenError } from "@/lib/server/repository";
import { SheetsConfigError } from "@/lib/server/sheets-client";
import type { Role } from "@/typings/inventory";

export const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Wraps a route: sign-in check, then maps repository errors to HTTP. The handler gets the caller's role. */
export const handle = async (req: Request, fn: (role: Role) => Promise<Response>): Promise<Response> => {
  const role = sessionRole(req);
  if (!role) return json({ error: "locked" }, 401);
  try {
    return await fn(role);
  } catch (e) {
    if (e instanceof ConflictError) return json({ error: "conflict", ...e.snapshot }, 409);
    if (e instanceof ForbiddenError) return json({ error: "forbidden", message: e.message }, 403);
    if (e instanceof SheetsConfigError) return json({ error: "config", message: e.message }, 503);
    console.error(e);
    return json({ error: "sheets", message: e instanceof Error ? e.message : "Unknown error" }, 502);
  }
};

/** Owner-only routes: everything that isn't recording a sale. */
export const adminOnly = (role: Role) => role === "admin";
export const forbidden = (message = "Only the owner can do that.") => json({ error: "forbidden", message }, 403);
