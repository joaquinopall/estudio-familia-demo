import { expect, test } from "@playwright/test";

test("home page loads and has a level-1 heading", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toBeVisible();
});
