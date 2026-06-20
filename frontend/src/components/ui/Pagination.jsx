import React from 'react';

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-border dark:border-border-dark px-3 py-1.5 text-sm text-ink dark:text-ink-dark disabled:opacity-40"
      >
        Previous
      </button>
      <span className="data-mono text-sm text-muted dark:text-muted-dark">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-border dark:border-border-dark px-3 py-1.5 text-sm text-ink dark:text-ink-dark disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
