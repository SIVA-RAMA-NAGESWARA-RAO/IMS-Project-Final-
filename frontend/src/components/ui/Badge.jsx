import React from 'react';
import { STAGES, REJECTED_STAGE, colorClasses } from '../pipeline/pipelineConfig';

// Renders any application/offer status as a pill, colored using the
// same stage palette as the pipeline visualizations.
const Badge = ({ status }) => {
  const stage = [...STAGES, REJECTED_STAGE].find((s) => s.key === status);
  const palette = colorClasses[stage?.color || 'brand'];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${palette.bg} ${palette.text}`}>
      {status}
    </span>
  );
};

export default Badge;
