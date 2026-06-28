import client from './client';

/**
 * Propose an action from a natural language command.
 * @param {string} message — User's command text
 * @returns {{ action, params, summary, confidence, nextSuggestion, fallback }}
 */
export const proposeAction = async (message) => {
  const { data } = await client.post('/agent/propose', { message });
  return data;
};

/**
 * Execute an approved action proposal.
 * @param {string} action — Action type (e.g. 'SCHEDULE_INTERVIEW')
 * @param {object} params — Extracted parameters
 * @returns {{ success, message, data, nextSuggestion }}
 */
export const executeAction = async (action, params) => {
  const { data } = await client.post('/agent/execute', { action, params });
  return data;
};

/**
 * Chat with the IMS assistant (multi-turn conversational).
 * @param {string} message — User's message
 * @param {Array} history — Previous messages [{ role: 'user'|'assistant', content: string }]
 * @returns {{ reply: string }}
 */
export const chatWithAgent = async (message, history = []) => {
  const { data } = await client.post('/agent/chat', { message, history });
  return data;
};

// ─── AI Services ────────────────────────────────────────────────────────────

export const parseResume = async (resumeText, autoSave = false) => {
  const { data } = await client.post(`/ai/services/parse-resume${autoSave ? '?autoSave=true' : ''}`, { resumeText });
  return data;
};

export const anonymizeResume = async (resumeText) => {
  const { data } = await client.post('/ai/services/anonymize-resume', { resumeText });
  return data;
};

export const draftScorecard = async (interviewNotes, competencies = [], jobTitle = '') => {
  const { data } = await client.post('/ai/services/draft-scorecard', { interviewNotes, competencies, jobTitle });
  return data;
};

export const generateQuestions = async (jobId, round, focusAreas = []) => {
  const { data } = await client.post('/ai/services/generate-questions', { jobId, round, focusAreas });
  return data;
};

export const rankCandidates = async (jobId, candidateIds = []) => {
  const { data } = await client.post('/ai/services/rank-candidates', { jobId, candidateIds });
  return data;
};
