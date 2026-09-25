# Google Sheets storage

With `NEXT_PUBLIC_STORAGE=sheets`, every batch, perfume, partner, cost and sale is stored in one Google Sheet. Every phone and laptop sees the same data, and the sheet can be opened and edited directly.

## Set up (about 10 minutes)

1. **Create a blank Google Sheet.** Copy its ID from the URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
2. **Create a service account** (the "robot" that edits the sheet):
   1. [console.cloud.google.com](https://console.cloud.google.com) → create a project (e.g. `sillage`).
   2. APIs & Services → Library → enable **Google Sheets API**.
   3. IAM & Admin → Service Accounts → **Create service account**. No roles needed.
   4. Open it → Keys → Add key → **JSON**. A file downloads.
3. **Share the sheet** with the service account's email (`…@….iam.gserviceaccount.com`) as **Editor**.
4. **Set environment variables** (Vercel → Project → Settings → Environment Variables, or `.env.local`):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_STORAGE` | `sheets` |
   | `GOOGLE_SHEET_ID` | from step 1 |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON |
   | `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON, in double quotes, `\n` kept as-is |
   | `APP_PASSCODE` | anything memorable. Required in practice: without it anyone with the URL can read and change the data |

5. **Deploy / restart.** On first open the app creates the tabs and seeds the "New stock" batch.

`NEXT_PUBLIC_STORAGE` is read at build time, so redeploy after changing it.

## What's in the sheet

| Tab | One row per | Key columns |
|---|---|---|
| Batches | batch | name, purchasedOn, rateAedToPhp, commissionPhp |
| Partners | partner in a batch | batchName, name, capitalAed |
| Expenses | extra cost | batchName, label, amountAed |
| Items | perfume in a batch | batchName, brand, name, retailPhp, costAed, qty |
| Sales | sale | batchName, perfume, date, qty, unitPricePhp, channel (reseller/direct) |
| Summary | batch, written by the app | bottles, sold, cost, revenue, profit. Read-only; edits here are overwritten |

## Editing directly in Sheets

- **Change any value** (a price, a quantity, a sale). The app picks it up next time it's opened or brought back to the foreground.
- **Add a row by hand**: leave `id` and `batchId` blank, fill in `batchName` (and `perfume` for a sale). The app links it and fills in the ids.
- **Column order doesn't matter.** Columns are matched by header name, so don't rename headers.
- **Don't add your own columns** to these tabs. The app rewrites whole rows, so extra columns won't stay lined up. Use the batch `notes` field, or a separate tab (the app ignores other tabs).
- **Safe against overwrites:** each save checks the batch hasn't changed since the app loaded it. If it has, nothing is written and the app reloads the latest version and asks you to redo the change.

## Limits worth knowing

- Google allows about 60 requests a minute per sheet. Each save is two requests, so normal use is nowhere near it.
- It's a spreadsheet, not a database. Fine for thousands of sales; past tens of thousands, move to Firestore (only `lib/server/repository.ts` would change).
- If the network drops, changes are kept and retried automatically. The sidebar shows "Not saved yet" with a retry button, and the browser warns before closing with unsaved changes.

## Try it without Google

```bash
NEXT_PUBLIC_STORAGE=sheets GOOGLE_SHEETS_FAKE=1 APP_PASSCODE=1234 npm run dev
```
Uses an in-memory sheet that resets on restart.
