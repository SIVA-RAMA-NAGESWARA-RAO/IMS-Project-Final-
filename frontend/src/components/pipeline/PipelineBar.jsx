import React from 'react';
import { STAGES, REJECTED_STAGE, colorClasses } from './pipelineConfig';

/**
 * The HR-facing signature element: a horizontal funnel bar showing how
 * many candidates currently sit in each stage. Segment widths are
 * proportional to candidate count, so the shape of the bar tells the
 * story of the pipeline at a glance — wide at "Applied", narrowing
 * toward "Offer".
 *
 * counts: { Applied: 12, Shortlisted: 5, 'Interview Scheduled': 3, Selected: 2, 'Offer Released': 1, Rejected: 7 }
 */
const PipelineBar = ({ counts = {} }) => {
  const allStages = [...STAGES, REJECTED_STAGE];
  const total = allStages.reduce((sum, s) => sum + (counts[s.key] || 0), 0) || 1;

  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-ink">Recruitment pipeline</h3>
        <span className="data-mono text-xs text-muted">{total} candidate{total !== 1 ? 's' : ''} tracked</span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-canvas">
        {allStages.map((stage) => {
          const count = counts[stage.key] || 0;
          const widthPct = (count / total) * 100;
          if (widthPct === 0) return null;
          return (
            <div
              key={stage.key}
              className={`${colorClasses[stage.color].dot} h-full transition-all`}
              style={{ width: `${widthPct}%` }}
              title={`${stage.label}: ${count}`}
            />
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
        {allStages.map((stage) => (
          <div key={stage.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${colorClasses[stage.color].dot}`} />
            <div>
              <p className="text-xs text-muted leading-none">{stage.label}</p>
              <p className="data-mono text-sm font-medium text-ink leading-tight">{counts[stage.key] || 0}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineBar;
