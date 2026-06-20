import React from 'react';

// A single pulsing placeholder block.
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-border dark:bg-border-dark ${className}`} />
);

// A stack of card-shaped placeholders, for list views while data loads.
export const SkeletonList = ({ rows = 4 }) => (
  <div className="grid gap-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-card border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
        <Skeleton className="h-4 w-1/3 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

export default Skeleton;
