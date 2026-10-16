import type { MatchRecord, RankingEntry } from "./contracts";

export function rankRecords(records: MatchRecord[]): RankingEntry[] {
  return [...records]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.durationSec - b.durationSec ||
        a.finishedAt.localeCompare(b.finishedAt) ||
        a.matchId.localeCompare(b.matchId),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
