// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/state/route";
import { POST as unlock } from "@/app/api/unlock/route";
import { setClient } from "@/lib/server/repository";
import { memoryClient } from "@/lib/server/sheets-client";

beforeEach(() => {
  process.env.APP_PASSCODE = "rose-oud";
  setClient(memoryClient());
});
afterEach(() => {
  delete process.env.APP_PASSCODE;
});

describe("passcode", () => {
  it("blocks the data API without the session cookie", async () => {
    const res = await GET(new Request("http://x/api/state"));
    expect(res.status).toBe(401);
  });

  it("rejects a wrong passcode and accepts the right one", async () => {
    const wrong = await unlock(new Request("http://x/api/unlock", { method: "POST", body: JSON.stringify({ passcode: "nope" }) }));
    expect(wrong.status).toBe(401);
    const right = await unlock(new Request("http://x/api/unlock", { method: "POST", body: JSON.stringify({ passcode: "rose-oud" }) }));
    const cookie = right.headers.get("set-cookie")!.split(";")[0]!;
    const res = await GET(new Request("http://x/api/state", { headers: { cookie } }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { state: { batches: unknown[] } }).state.batches).toHaveLength(1);
  });
});
