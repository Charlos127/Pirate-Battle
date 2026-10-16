import { describe, it, expect } from "vitest";
import { createHudStore } from "./hudStore";

describe("hudStore", () => {
  const v = {
    status: "running",
    score: 0,
    hp: 10,
    maxHp: 10,
    secondsLeft: 90,
    endReason: null,
  } as const;

  it("notifies only when a visible value changes", () => {
    const store = createHudStore();
    let notifications = 0;
    store.subscribe(() => notifications++);
    store.getState().sync(v);
    store.getState().sync({ ...v }); // 60 frames with identical values...
    store.getState().sync({ ...v });
    expect(notifications).toBe(1); // ...cause a single notification
    store.getState().sync({ ...v, score: 1 });
    expect(notifications).toBe(2);
  });

  it("keeps each match isolated", () => {
    const a = createHudStore(),
      b = createHudStore();
    a.getState().sync({ ...v, score: 5 });
    expect(b.getState().score).toBe(0);
  });
});
