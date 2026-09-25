import { expect, test } from "@playwright/test";

test("load sample, record a sale, see stock drop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /load the “new stock” sheet/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New stock" })).toBeVisible();
  const sell = page.getByRole("button", { name: "Sell" }).first();
  await sell.click();
  await page.getByRole("button", { name: "Record sale" }).first().click();
  await expect(page.getByText(/Recorded 1 bottle of Liquid Brun/)).toBeVisible();
  await page.getByRole("tab", { name: /Sales/ }).click();
  await expect(page.getByText("Liquid Brun").first()).toBeVisible();
});
