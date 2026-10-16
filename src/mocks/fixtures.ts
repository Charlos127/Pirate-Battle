// mocks/fixtures.ts — deterministic, no Math.random
import type { MatchRecord } from "../api/contracts";
import { Rng } from "../game/core/rng";

export function fixtureRecords(count = 45): MatchRecord[] {
  const rng = new Rng(2024);
  const names = [
    "Blackbeard",
    "Anne",
    "Calico",
    "Morgan",
    "Bellamy",
    "Rackham",
    "Kidd",
    "Roberts",
    "Bonny",
  ];
  return Array.from({ length: count }, (_, i) => ({
    matchId: `fixture-${i}`,
    playerId: `npc-${i % names.length}`,
    playerName: names[i % names.length]!,
    finishedAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    score: Math.floor(rng.range(0, 40)),
    durationSec: Math.round(rng.range(30, 90)),
    endReason: rng.next() > 0.5 ? "time" : "death",
    options: { sessionSeconds: 90, spawnSeconds: 2.5 },
    configKey: "s90-e2.5",
  }));
}
