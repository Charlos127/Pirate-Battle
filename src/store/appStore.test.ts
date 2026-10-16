// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./appStore";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ screen: "menu", lastResult: null, matchNonce: 0 });
});

describe("appStore", () => {
  it("startMatch bumps the nonce (forces a clean remount)", () => {
    useAppStore.getState().startMatch();
    useAppStore.getState().startMatch();
    expect(useAppStore.getState().matchNonce).toBe(2);
  });
  it("finishMatch builds a record with a stable matchId and config snapshot", () => {
    useAppStore
      .getState()
      .finishMatch({ score: 3, durationSec: 60, endReason: "time" });
    const r = useAppStore.getState().lastResult!;
    expect(r.matchId).toBeTruthy();
    expect(r.options).toEqual(useAppStore.getState().options);
  });
});
