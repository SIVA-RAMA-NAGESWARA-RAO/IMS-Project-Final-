import client from './client';

/** Natural language → analytics query. */
export const queryAnalytics = async (question) => {
  const { data } = await client.post('/ai/analytics', { question });
  return data;
};

/** Recruitment funnel data (pre-built). */
export const getFunnelData = async () => {
  const { data } = await client.get('/ai/analytics/funnel');
  return data;
};

/** Skill match radar data. */
export const getSkillMatch = async (jobId, candidateId) => {
  const { data } = await client.post('/ai/analytics/skill-match', { jobId, candidateId });
  return data;
};

/** Time-to-hire trend data. */
export const getTimeToHire = async () => {
  const { data } = await client.get('/ai/analytics/time-to-hire');
  return data;
};

/** Department summary data. */
export const getDepartmentSummary = async () => {
  const { data } = await client.get('/ai/analytics/department-summary');
  return data;
};
