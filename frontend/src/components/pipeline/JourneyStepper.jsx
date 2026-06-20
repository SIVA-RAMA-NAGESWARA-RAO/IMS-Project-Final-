import React from 'react';
import { STAGES, REJECTED_STAGE, colorClasses, stageIndex } from './pipelineConfig';

/**
 * The candidate-facing mirror of PipelineBar: a vertical stepper showing
 * where this one application sits on the same stage vocabulary HR sees
 * in aggregate. If the application was rejected, the stepper freezes at
 * the stage it reached and marks the rejection distinctly rather than
 * continuing the happy path.
 */
const JourneyStepper = ({ currentStatus }) => {
  const isRejected = currentStatus === 'Rejected';
  const activeIndex = stageIndex(currentStatus);

  return (
    <ol className="relative ml-3 border-l-2 border-border">
      {STAGES.map((stage, idx) => {
        const reached = !isRejected && idx <= activeIndex;
        const isCurrent = !isRejected && idx === activeIndex;
        const palette = colorClasses[stage.color];

        return (
          <li key={stage.key} className="mb-6 ml-6 last:mb-0">
            <span
              className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-canvas
                ${reached ? palette.dot : 'bg-border'}`}
            />
            <p className={`text-sm font-medium ${reached ? 'text-ink' : 'text-muted'}`}>
              {stage.label}
              {isCurrent && <span className={`ml-2 text-xs font-normal ${palette.text}`}>● current stage</span>}
            </p>
          </li>
        );
      })}

      {isRejected && (
        <li className="ml-6">
          <span
            className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-canvas ${colorClasses.clay.dot}`}
          />
          <p className="text-sm font-medium text-clay">{REJECTED_STAGE.label}</p>
        </li>
      )}
    </ol>
  );
};

export default JourneyStepper;
