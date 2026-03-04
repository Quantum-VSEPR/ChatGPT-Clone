import { test, expect } from "@playwright/test";

test.describe("Public chat shell", () => {
  test("removes legacy explore/search UI bits", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/GPT Clone/i);
    await expect(page.getByText("Explore GPTs")).toHaveCount(0);
    await expect(
      page.getByText(/plus create images and upload files/i)
    ).toHaveCount(0);
    await expect(page.locator('button[title="Search"]')).toHaveCount(0);
  });

  test("sidebar collapse works without login redirect", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("button", { name: "Expand sidebar" })
    ).toBeVisible();
  });
});
