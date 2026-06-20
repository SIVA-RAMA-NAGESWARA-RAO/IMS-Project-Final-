import React from 'react';

const EmptyState = ({ title, message }) => (
  <div className="rounded-card border border-dashed border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-6 py-12 text-center">
    <p className="font-display text-lg text-ink dark:text-ink-dark">{title}</p>
    <p className="mt-1 text-sm text-muted dark:text-muted-dark">{message}</p>
  </div>
);

export default EmptyState;
