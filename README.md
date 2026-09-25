# Abitria — perfume stock & profit, batch by batch

Next.js 15 (App Router) · TypeScript strict · Tailwind 3 · Framer Motion

## Run it
```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production
```
Deploys to Vercel as-is (no env vars needed).

## Use it
1. On first open, the owners' `new stock` sheet is already loaded as the default batch. Start more with **New batch**, or **Import** another sheet.
2. Add perfumes: brand, retail (PHP), cost per bottle (AED), bottles. Margin previews as you type.
3. **Sell** on any row → pick qty, reseller (net) or direct (retail), date, note.
4. The bottle shows stock left; the dashed line is break-even. Past it, the liquid turns amber.
5. **Export .xlsx** gives back the original sheet layout with live formulas plus a Sales sheet.
6. **Backup** page: download/restore everything as JSON (data lives in this browser).

## How the numbers work (from the owners' sheet)
| Column | Formula |
|---|---|
| less com | retail − commission (default ₱300) |
| cost ph | cost AED × rate (default 17) |
| total value / stock value | cost AED × stock |
| sales | less com × stock |
| Margin value | less com − cost ph |
| Margin% | margin value ÷ less com |

Batch profit = sales in AED − (goods cost + other costs). The original sheet subtracted *capital* instead of cost; here capital is tracked separately and profit is split by each partner's capital share.

## Structure
```
app/                    routes: / · /batches/new · /batches/[id] · /import · /data, plus app/api/ (Sheets mode)
components/ui/          primitives (button cva variants, field, stepper, segmented, tabs, toast, theme toggle, animated number)
components/elements/    AppShell, Flacon (the bottle meter), Collapse, Skeleton, Delta
components/inventory/   StockTable, ItemForm, SaleForm, SalesList, BatchHeader, BatchSettingsForm, MoneyRows
lib/                    calc (all maths), batch-ops (pure mutations), store (context), storage (persistence adapter), spreadsheet (xlsx in/out), animation tokens
typings/inventory.ts    data model
content/sample-batch.json  the owners' sheet as seed data
__tests__/              Vitest — maths pinned to the sheet, real .xlsx import, form behaviour
e2e/                    Playwright
```

## Storage: this browser or Google Sheets
- **Default:** saved in the browser (`lib/storage.ts`). Nothing to configure.
- **Google Sheets:** set `NEXT_PUBLIC_STORAGE=sheets` plus the Google variables in `.env.example`. Full setup and the sheet layout: [`docs/google-sheets.md`](docs/google-sheets.md). Server code lives in `lib/server/` (service-account auth with no Google SDK, repository with conflict checks, passcode gate) and `app/api/`.

## Who can sign in

Two passcodes, both set as environment variables. Sign-in only exists in Google Sheets mode; in browser-local mode there is no server to enforce anything.

| | `APP_PASSCODE` (owner) | `SELLER_PASSCODE` (seller) |
| --- | --- | --- |
| Batches, stock, sales | full | read, plus records sales |
| Cost, margin, profit, partners, expenses | yes | **never sent to the browser** |
| New batch, import, backup, delete, batch setup | yes | no |
| Editing a sale | any | only ones they recorded |

The seller boundary is enforced on the server, not just hidden in the UI: `/api/state` strips cost, capital, expenses and notes for a seller (`lib/server/seller.ts`), and their only write rebuilds the batch from the sheet and accepts nothing but their own sales, so a tampered payload cannot touch prices or stock. Sales carry a `soldBy` column in the sheet to record who entered them. Leave `SELLER_PASSCODE` blank and no seller sign-in exists.

Sign out from the bottom of the sidebar (or the top bar on a phone) to clear the session and return to the passcode screen.
- **Firestore later:** replace `lib/server/repository.ts`; the API and the app stay the same.

## Tests
```bash
npm run test:run     # unit
npx playwright install && npm run test:e2e
```

## Design
See `PRODUCT.md` and `DESIGN.md`. Impeccable and the TenTwenty scaffold skill are in `.claude/skills/`.
