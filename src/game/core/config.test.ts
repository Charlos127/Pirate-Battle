import { describe, it, expect } from "vitest";
import {
  buildConfig,
  DEFAULT_OPTIONS,
  validateOptions,
  DEFAULT_CONFIG,
} from "./config";

describe("options validation", () => {
  it("accepts defaults", () =>
    expect(validateOptions(DEFAULT_OPTIONS)).toEqual({}));
  it("rejects session outside 60-180", () => {
    expect(
      validateOptions({ ...DEFAULT_OPTIONS, sessionSeconds: 59 })
        .sessionSeconds,
    ).toBeDefined();
    expect(
      validateOptions({ ...DEFAULT_OPTIONS, sessionSeconds: 181 })
        .sessionSeconds,
    ).toBeDefined();
  });
  it("rejects non-positive spawn interval and NaN", () => {
    expect(
      validateOptions({ ...DEFAULT_OPTIONS, spawnSeconds: 0 }).spawnSeconds,
    ).toBeDefined();
    expect(
      validateOptions({ ...DEFAULT_OPTIONS, spawnSeconds: NaN }).spawnSeconds,
    ).toBeDefined();
  });
});

describe("buildConfig", () => {
  it("returns an isolated snapshot", () => {
    const cfg = buildConfig({ sessionSeconds: 120, spawnSeconds: 1 });
    cfg.player.maxHp = 999;
    expect(DEFAULT_CONFIG.player.maxHp).not.toBe(999);
    expect(cfg.session.durationSec).toBe(120);
  });
});
