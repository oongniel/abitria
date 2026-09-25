import { clearCookie, roleForPasscode, sessionCookie } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = async (req: Request) => {
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  // Small fixed delay blunts guessing.
  await new Promise((r) => setTimeout(r, 400));
  const role = passcode ? roleForPasscode(passcode) : null;
  if (!role) return json({ error: "wrong" }, 401);
  return json({ ok: true, role }, 200, { "Set-Cookie": sessionCookie(role) });
};

/** Sign out — the browser is left with no session and the app shows the passcode screen. */
export const DELETE = () => json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
