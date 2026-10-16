import { useState } from "react";
import { useHistory } from "../api/hooks";
import { getPlayerId } from "../store/appStore";
import { ErrorBox, formatDate, formatEnd, Pagination } from "./commom";

export function HistoryTab() {
  const me = getPlayerId();
  const [page, setPage] = useState(1);
  const q = useHistory(me, page);
  const data = q.data;

  if (q.isPending) return <p role="status">Loading match history…</p>;
  if (!data)
    return (
      <ErrorBox
        message="Could not load your match history."
        onRetry={() => void q.refetch()}
      />
    );

  return (
    <div aria-busy={q.isFetching}>
      {q.isFetching && <p className="muted">Refreshing…</p>}
      {q.isError && (
        <ErrorBox
          message="Could not refresh your history. Showing the last data."
          onRetry={() => void q.refetch()}
        />
      )}

      {data.items.length === 0 ? (
        <p>You have not completed any matches yet.</p>
      ) : (
        <table>
          <caption className="sr-only">
            Your match history, newest first
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Score</th>
              <th scope="col">Duration</th>
              <th scope="col">Ended by</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.matchId}>
                <th scope="row">{formatDate(r.finishedAt)}</th>
                <td>{r.score}</td>
                <td>{r.durationSec}s</td>
                <td>{formatEnd(r.endReason)}</td>
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
