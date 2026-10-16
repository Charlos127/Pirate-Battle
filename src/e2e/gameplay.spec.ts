/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import { advance, startMatch, state } from "./helpers";

test("moves forward and rotates using real keyboard input", async ({
  page,
}) => {
  await startMatch(page);
  const s0: any = await state(page);
  await page.keyboard.down("ArrowUp");
  await advance(page, 500);
  await page.keyboard.up("ArrowUp");
  const s1: any = await state(page);
  expect(s1.player.pos.y).toBeLessThan(s0.player.pos.y);

  await page.keyboard.down("ArrowRight");
  await advance(page, 300);
  await page.keyboard.up("ArrowRight");
  expect(((await state(page)) as any).player.heading).toBeGreaterThan(0);
});

test("front fire respects cooldown and side fire shoots three projectiles", async ({
  page,
}) => {
  await startMatch(page);
  await page.keyboard.down("Space");
  await advance(page, 100);
  expect(((await state(page)) as any).projectiles).toHaveLength(1);
  await page.keyboard.up("Space");
  await page.keyboard.press("KeyQ"); // pressed & released; one frame is enough
  await page.keyboard.down("KeyQ");
  await advance(page, 50);
  await page.keyboard.up("KeyQ");
  const s: any = await state(page);
  expect(s.projectiles.length).toBeGreaterThanOrEqual(4);
});

test("scores exactly once per destroyed enemy", async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => {
    window.__pb!.setPlayer({ x: 200, y: 600, heading: 0 });
    window.__pb!.spawn("shooter", 200, 350);
  });
  await page.keyboard.down("Space");
  await advance(page, 4000);
  await page.keyboard.up("Space");
  expect(((await state(page)) as any).score).toBeLessThanOrEqual(1);
});

test("match ends by time and simulation stops", async ({ page }) => {
  test.setTimeout(120_000);
  await startMatch(page);
  for (let i = 0; i < 19; i++) await advance(page, 10_000);
  await expect(
    page.getByRole("heading", { name: /match result/i }),
  ).toBeVisible();
});

test("pause on blur does not advance timer; resume needs user action", async ({
  page,
}) => {
  await startMatch(page);
  await advance(page, 2000);
  const t = ((await state(page)) as any).time;

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect(((await state(page)) as any).status).toBe("paused"); // 1) a simulação pausou?
  await expect(page.getByRole("dialog", { name: /paused/i })).toBeVisible(); // 2) a UI refletiu?

  await advance(page, 5000);
  expect(((await state(page)) as any).time).toBe(t);

  await page.getByRole("button", { name: "Resume" }).click();
  expect(((await state(page)) as any).status).toBe("running");
});

test("visual: main menu, arena, result", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/?e2e=1&scenario=success&seed=1");
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  await expect(page).toHaveScreenshot("menu.png", {
    mask: [page.locator("td:last-child")], // mascara a coluna de data
  });

  await startMatch(page, "&seed=1");
  await page.evaluate(() =>
    window.__pb!.setPlayer({ x: 640, y: 600, heading: 0 }),
  );
  await advance(page, 100);
  await expect(page.getByTestId("arena")).toHaveScreenshot("arena.png", {
    maxDiffPixelRatio: 0.02,
  });

  for (let i = 0; i < 19; i++) await advance(page, 10_000);
  await expect(
    page.getByRole("heading", { name: /match result/i }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("result.png");
});
