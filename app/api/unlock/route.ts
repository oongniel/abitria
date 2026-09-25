import { checkPasscode, clearCookie, sessionCookie } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = async (req: Request) => {
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  // Small fixed delay blunts guessing.
  await new Promise((r) => setTimeout(r, 400));
  if (!passcode || !checkPasscode(passcode)) return json({ error: "wrong" }, 401);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie() });
};

export const DELETE = () => json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
