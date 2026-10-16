/* eslint-disable react-refresh/only-export-components */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const formatEnd = (r: "time" | "death") =>
  r === "time" ? "Time is up" : "Ship destroyed";

/** Accessible error: role="alert" is announced by screen readers; Retry re-runs the query. */
export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="error-box">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
  busy,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  busy: boolean;
}) {
  return (
    <nav aria-label="Pagination" className="pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1 || busy}
      >
        Previous
      </button>
      <span aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages || busy}
      >
        Next
      </button>
    </nav>
  );
}
