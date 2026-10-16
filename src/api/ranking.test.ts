import { describe, it, expect } from "vitest";
import { rankRecords } from "./ranking";
import type { MatchRecord } from "./contracts";

const rec = (o: Partial<MatchRecord>): MatchRecord => ({
  matchId: "m",
  playerId: "p",
  playerName: "P",
  finishedAt: "2026-01-01T00:00:00Z",
  score: 0,
  durationSec: 60,
  endReason: "time",
  options: { sessionSeconds: 60, spawnSeconds: 2 },
  configKey: "k",
  ...o,
});

describe("ranking order", () => {
  it("sorts by score desc, then shorter duration, then earlier date, then matchId", () => {
    const r = rankRecords([
      rec({
        matchId: "d",
        score: 5,
        durationSec: 60,
        finishedAt: "2026-01-02T00:00:00Z",
      }),
      rec({
        matchId: "c",
        score: 5,
        durationSec: 60,
        finishedAt: "2026-01-01T00:00:00Z",
      }),
      rec({ matchId: "b", score: 5, durationSec: 40 }),
      rec({ matchId: "a", score: 9 }),
    ]);
    expect(r.map((x) => x.matchId)).toEqual(["a", "b", "c", "d"]);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3, 4]);
  });
  it("is stable regardless of input order", () => {
    const base = [
      rec({ matchId: "x", score: 1 }),
      rec({ matchId: "y", score: 1 }),
    ];
    expect(rankRecords(base).map((r) => r.matchId)).toEqual(
      rankRecords([...base].reverse()).map((r) => r.matchId),
    );
  });
});
