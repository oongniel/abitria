import { createSign } from "node:crypto";

import type { Grid } from "@/lib/server/sheet-schema";

/** The five Sheets operations the repository needs — real REST client or in-memory fake. */
export interface SheetsClient {
  listTabs(): Promise<string[]>;
  addTabs(titles: string[]): Promise<void>;
  read(titles: string[]): Promise<Record<string, Grid>>;
  write(data: { title: string; values: Grid }[]): Promise<void>;
}

export class SheetsConfigError extends Error {}

/* ---------- Google REST implementation (service account, no SDK) ---------- */

const API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

let cachedToken: { token: string; exp: number } | null = null;

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

const accessToken = async (email: string, privateKey: string): Promise<string> => {
  if (cachedToken && cachedToken.exp - 60 > Date.now() / 1000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(privateKey))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new SheetsConfigError(`Google sign-in failed (${res.status}). Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, exp: now + json.expires_in };
  return json.access_token;
};

const quote = (title: string) => `'${title.replace(/'/g, "''")}'`;

export const restClient = (cfg: { sheetId: string; email: string; privateKey: string }): SheetsClient => {
  const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const token = await accessToken(cfg.email, cfg.privateKey);
    const res = await fetch(`${API}/${cfg.sheetId}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
    if (res.status === 403 || res.status === 404) {
      throw new SheetsConfigError(`Google Sheets refused access (${res.status}). Share the spreadsheet with ${cfg.email} as an Editor, and check GOOGLE_SHEET_ID.`);
    }
    if (!res.ok) throw new Error(`Google Sheets error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (await res.json()) as T;
  };

  return {
    async listTabs() {
      const r = await call<{ sheets: { properties: { title: string } }[] }>("?fields=sheets.properties.title");
      return r.sheets.map((s) => s.properties.title);
    },
    async addTabs(titles) {
      if (!titles.length) return;
      await call(":batchUpdate", {
        method: "POST",
        body: JSON.stringify({ requests: titles.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
      });
    },
    async read(titles) {
      const qs = titles.map((t) => `ranges=${encodeURIComponent(quote(t))}`).join("&");
      const r = await call<{ valueRanges: { values?: Grid }[] }>(`/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`);
      return Object.fromEntries(titles.map((t, i) => [t, r.valueRanges[i]?.values ?? []]));
    },
    async write(data) {
      await call("/values:batchUpdate", {
        method: "POST",
        body: JSON.stringify({ valueInputOption: "RAW", data: data.map((d) => ({ range: `${quote(d.title)}!A1`, values: d.values.map((r) => r.map((c) => c ?? "")) })) }),
      });
    },
  };
};

/* ---------- In-memory fake: tests, and trying Sheets mode without Google ---------- */

export const memoryClient = (initial: Record<string, Grid> = {}): SheetsClient & { tabs: Record<string, Grid> } => {
  const tabs: Record<string, Grid> = structuredClone(initial);
  return {
    tabs,
    async listTabs() {
      return Object.keys(tabs);
    },
    async addTabs(titles) {
      titles.forEach((t) => (tabs[t] ??= []));
    },
    async read(titles) {
      // Mimic Sheets: trailing empty cells and rows are not returned.
      return Object.fromEntries(
        titles.map((t) => {
          const rows = (tabs[t] ?? []).map((r) => {
            const out = [...r];
            while (out.length && (out[out.length - 1] === "" || out[out.length - 1] == null)) out.pop();
            return out;
          });
          while (rows.length && rows[rows.length - 1]!.length === 0) rows.pop();
          return [t, structuredClone(rows)];
        }),
      );
    },
    async write(data) {
      for (const d of data) {
        const grid = (tabs[d.title] ??= []);
        d.values.forEach((row, ri) => {
          grid[ri] ??= [];
          row.forEach((c, ci) => (grid[ri]![ci] = c ?? ""));
        });
      }
    },
  };
};
