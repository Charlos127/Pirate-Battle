import { test, expect } from "@playwright/test";

test("asset failure shows an accessible error and Retry recovers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__blockShips = true;
  });

  await page.goto("/?e2e=1");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play" }).click();

  const alert = page.getByRole("alert").filter({ hasText: /assets/i });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText(/failed to load assets/i);

  await page.evaluate(() => {
    window.__blockShips = false;
  });
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByTestId("hud-time")).toBeVisible({ timeout: 15_000 });
  await expect(alert).toBeHidden();
});

test("no asset request returns 404 on the main flow", async ({ page }) => {
  const bad: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      bad.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play" }).click();
  await page.waitForFunction(() => window.__pb !== undefined);
  expect(bad).toEqual([]);
});

test("loading progress is visible while assets load", async ({ page }) => {
  await page.route("**/assets/**/*.png", async (r) => {
    await new Promise((res) => setTimeout(res, 150));
    await r.continue();
  });
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Play" }).click();
  await expect(
    page.getByRole("progressbar", { name: "Loading assets" }),
  ).toBeVisible();
});
