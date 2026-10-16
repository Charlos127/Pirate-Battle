import { useEffect, useRef } from "react";
import type { LastResult } from "../store/appStore";
import { useSubmitMatch } from "../api/hooks";

export function ResultScreen({
  result,
  onPlayAgain,
  onMenu,
}: {
  result: LastResult;
  onPlayAgain: () => void;
  onMenu: () => void;
}) {
  const submit = useSubmitMatch();
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (sent.current === result.matchId) return;
    sent.current = result.matchId;
    submit.mutate({ ...result, playerName: "You" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.matchId]);

  const status = submit.isSuccess
    ? "Saved to ranking and history."
    : submit.isPending
      ? "Saving match…"
      : submit.isError
        ? "Could not save yet. It is stored locally and will be retried."
        : "";

  return (
    <main className="menu panel">
      <h1>Match result</h1>
      <dl>
        <dt>Score</dt>
        <dd>{result.score}</dd>
        <dt>Time played</dt>
        <dd>{result.durationSec}s</dd>
        <dt>Ended by</dt>
        <dd>{result.endReason === "time" ? "Time is up" : "Ship destroyed"}</dd>
      </dl>
      <p role="status">{status}</p>
      <div className="menu-actions">
        {submit.isError && (
          <button
            onClick={() => submit.mutate({ ...result, playerName: "You" })}
          >
            Retry
          </button>
        )}
        <button onClick={onPlayAgain}>Play Again</button>
        {/* works even with a pending record */}
        <button onClick={onMenu}>Main Menu</button>
      </div>
    </main>
  );
}
