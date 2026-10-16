import { useState } from "react";
import { configKey } from "../game/core/config";
import { useRanking } from "../api/hooks";
import { getPlayerId, useAppStore } from "../store/appStore";
import { ErrorBox, formatDate, Pagination } from "./commom";

export function RankingTab() {
  const options = useAppStore((s) => s.options);
  const me = getPlayerId();
  const [page, setPage] = useState(1);
  const q = useRanking(configKey(options), page);
  const data = q.data;

  if (q.isPending) return <p role="status">Loading ranking…</p>;
  if (!data)
    return (
      <ErrorBox
        message="Could not load the ranking."
        onRetry={() => void q.refetch()}
      />
    );

  return (
    <div aria-busy={q.isFetching}>
      <p>
        Comparing matches with the same settings: {options.sessionSeconds}s
        session, {options.spawnSeconds}s spawn interval.
        {q.isFetching && <span className="muted"> Refreshing…</span>}
      </p>

      {/* Error while we still have (stale) data: keep showing it, but tell the user. */}
      {q.isError && (
        <ErrorBox
          message="Could not refresh the ranking. Showing the last data."
          onRetry={() => void q.refetch()}
        />
      )}

      {data.items.length === 0 ? (
        <p>No matches ranked yet. Play a match to appear here!</p>
      ) : (
        <table>
          <caption className="sr-only">Ranking, ordered by score</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col">Score</th>
              <th scope="col">Time</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr
                key={r.matchId}
                className={r.playerId === me ? "me" : undefined}
              >
                <th scope="row">{r.rank}</th>
                <td>
                  {r.playerName}
                  {r.playerId === me ? " (you)" : ""}
                </td>
                <td>{r.score}</td>
                <td>{r.durationSec}s</td>
                <td>{formatDate(r.finishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        page={page}
        totalPages={data.totalPages}
        onPage={setPage}
        busy={q.isPlaceholderData}
      />
    </div>
  );
}
