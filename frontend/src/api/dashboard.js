import client from './client';

// ─── Dashboard Analytics API ────────────────────────────────────────────────

export const getKPISummary = () =>
  client.get('/dashboard/kpi').then((r) => r.data);

export const getPipelineOverview = (params = {}) =>
  client.get('/dashboard/pipeline', { params }).then((r) => r.data);

export const getTimeToHire = (params = {}) =>
  client.get('/dashboard/time-to-hire', { params }).then((r) => r.data);

export const getConversionFunnel = (params = {}) =>
  client.get('/dashboard/funnel', { params }).then((r) => r.data);

export const getInterviewerWorkload = (params = {}) =>
  client.get('/dashboard/interviewer-workload', { params }).then((r) => r.data);

export const getOfferStats = (params = {}) =>
  client.get('/dashboard/offer-stats', { params }).then((r) => r.data);

export const getJobsOverview = () =>
  client.get('/dashboard/jobs-overview').then((r) => r.data);
