import client from './client';

// ─── Scorecard API ──────────────────────────────────────────────────────────

export const submitScorecard = (data) =>
  client.post('/scorecards', data).then((r) => r.data);

export const getScorecardsForInterview = (interviewId) =>
  client.get(`/scorecards/interview/${interviewId}`).then((r) => r.data);

export const getScorecardsForApplication = (applicationId) =>
  client.get(`/scorecards/application/${applicationId}`).then((r) => r.data);
