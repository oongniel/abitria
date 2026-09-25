import { createHmac, timingSafeEqual } from "node:crypto";

import type { Role } from "@/typings/inventory";

export const COOKIE = "abitria_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days — she shouldn't have to re-enter it often

/** The passcode for each role. Admin's is required; a seller exists only once SELLER_PASSCODE is set. */
const passcode = (role: Role) => (role === "admin" ? process.env.APP_PASSCODE : process.env.SELLER_PASSCODE)?.trim() || "";

export const authEnabled = () => passcode("admin") !== "";
/** A seller passcode that matches the admin's would silently grant full access. */
const sellerEnabled = () => authEnabled() && passcode("seller") !== "" && passcode("seller") !== passcode("admin");
const roles = (): Role[] => (sellerEnabled() ? ["admin", "seller"] : ["admin"]);

const token = (role: Role) => createHmac("sha256", passcode(role)).update(`abitria:v1:${role}`).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The role this request is signed in as, or null when it isn't. Without a passcode everyone is the owner. */
export const sessionRole = (req: Request): Role | null => {
  if (!authEnabled()) return "admin";
  const cookie = req.headers.get("cookie") ?? "";
  const value = cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [role, signature] = decodeURIComponent(value).split(".", 2) as [string, string | undefined];
  const known = roles().find((r) => r === role);
  return known && signature && safeEqual(signature, token(known)) ? known : null;
};

/** Which role the attempt unlocks, or null. Admin wins if both passcodes were set to the same thing. */
export const roleForPasscode = (attempt: string): Role | null => roles().find((r) => safeEqual(attempt.trim(), passcode(r))) ?? null;

export const sessionCookie = (role: Role) =>
  `${COOKIE}=${role}.${token(role)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
