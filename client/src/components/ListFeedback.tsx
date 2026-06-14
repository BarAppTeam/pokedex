interface ListFeedbackProps {
  total: number;
  visible: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export function ListFeedback({
  total,
  visible,
  page,
  totalPages,
  isLoading,
  error,
}: ListFeedbackProps) {
  const pageLabel = totalPages > 0 ? `Page ${page} of ${totalPages}` : "Page 0 of 0";

  return (
    <>
      <section className="status-row" aria-live="polite">
        <span>{pageLabel}</span>
        <span>
          Showing {visible.toLocaleString()} of {total.toLocaleString()}
        </span>
      </section>

      {error ? <div className="error-state">{error}</div> : null}

      {!isLoading && !error && visible === 0 ? (
        <section className="empty-state">
          <h2>No Pokémon found</h2>
          <p>Adjust the filters or search text.</p>
        </section>
      ) : null}
    </>
  );
}
