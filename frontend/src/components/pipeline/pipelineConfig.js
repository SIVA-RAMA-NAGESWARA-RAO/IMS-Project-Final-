// Single source of truth for the hiring-pipeline vocabulary used across
// the HR Pipeline Bar and the candidate's Journey Stepper. Keeping the
// stage list, order, and color mapping in one place is what keeps the
// HR aggregate view and the candidate's personal view visually consistent.
export const STAGES = [
  { key: 'Applied', label: 'Applied', color: 'brand' },
  { key: 'Shortlisted', label: 'Shortlisted', color: 'signal' },
  { key: 'Interview Scheduled', label: 'Interview', color: 'signal' },
  { key: 'Selected', label: 'Selected', color: 'moss' },
  { key: 'Offer Released', label: 'Offer', color: 'moss' },
];

export const REJECTED_STAGE = { key: 'Rejected', label: 'Rejected', color: 'clay' };

export const colorClasses = {
  brand: { dot: 'bg-brand', text: 'text-brand', bg: 'bg-brand-light', ring: 'ring-brand' },
  signal: { dot: 'bg-signal', text: 'text-signal', bg: 'bg-signal-light', ring: 'ring-signal' },
  moss: { dot: 'bg-moss', text: 'text-moss', bg: 'bg-moss-light', ring: 'ring-moss' },
  clay: { dot: 'bg-clay', text: 'text-clay', bg: 'bg-clay-light', ring: 'ring-clay' },
};

export const stageIndex = (statusKey) => STAGES.findIndex((s) => s.key === statusKey);
