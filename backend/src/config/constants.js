// Shared enums — keep these in sync with the frontend's status vocabulary.
// This list mirrors Module 8 (Candidate Status Tracking) from the project spec.
const APPLICATION_STATUS = [
  'Applied',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected',
  'Offer Released',
];

// 'admin' added for enterprise RBAC — only admins can invite HR / interviewers.
const ROLES = ['candidate', 'hr', 'interviewer', 'admin'];

const INTERVIEW_MODE = ['onsite', 'video', 'phone'];
const INTERVIEW_STATUS = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
const RECOMMENDATION = ['select', 'reject', 'hold'];
const OFFER_STATUS = ['pending', 'accepted', 'rejected', 'expired'];
const JOB_STATUS = ['open', 'closed'];

module.exports = {
  APPLICATION_STATUS,
  ROLES,
  INTERVIEW_MODE,
  INTERVIEW_STATUS,
  RECOMMENDATION,
  OFFER_STATUS,
  JOB_STATUS,
};
