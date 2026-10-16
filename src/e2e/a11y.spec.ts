import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const screens: Array<[string, (p: Page) => Promise<void>]> = [
  ["main menu", async () => {}],
  [
    "options",
    async (p) => {
      await p.getByRole("button", { name: "Options" }).click();
    },
  ],
  [
    "ranking tab",
    async (p) => {
      await p.getByRole("tab", { name: "Ranking" }).click();
    },
  ],
];

for (const [name, setup] of screens) {
  test(`no axe violations: ${name}`, async ({ page }) => {
    await page.goto("/?e2e=1");
    await setup(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("keyboard navigation shows a visible focus ring", async ({ page }) => {
  await page.goto("/?e2e=1");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible(); // espera a app renderizar
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});
