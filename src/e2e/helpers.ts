import { expect, type Page } from "@playwright/test";

export async function startMatch(page: Page, query = "") {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  await page.goto(`/?e2e=1${query}`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`/?e2e=1${query}`);
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByTestId("hud-time")).toBeVisible({ timeout: 15_000 }); // HUD só existe com a sessão criada
  await page.waitForFunction(() => window.__pb !== undefined, undefined, {
    timeout: 10_000,
  });
  await page.evaluate(() => window.__pb!.manualClock());
}

export const state = (page: Page) =>
  page.evaluate(() => window.__pb!.state() as unknown);
export const advance = (page: Page, ms: number) =>
  page.evaluate((m) => window.__pb!.advance(m), ms);
