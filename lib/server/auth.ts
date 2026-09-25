import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "sillage_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days — she shouldn't have to re-enter it often

const passcode = () => process.env.APP_PASSCODE?.trim() || "";
const token = () => createHmac("sha256", passcode()).update("sillage:v1").digest("base64url");

export const authEnabled = () => passcode() !== "";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const isAuthed = (req: Request): boolean => {
  if (!authEnabled()) return true;
  const cookie = req.headers.get("cookie") ?? "";
  const value = cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return value ? safeEqual(decodeURIComponent(value), token()) : false;
};

export const checkPasscode = (attempt: string) => authEnabled() && safeEqual(attempt.trim(), passcode());

export const sessionCookie = () =>
  `${COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
