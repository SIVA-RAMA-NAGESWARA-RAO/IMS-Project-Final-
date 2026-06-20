import client from './client';

export const funnelSummary = () => client.get('/analytics/funnel').then((r) => r.data);
export const timeToHire = () => client.get('/analytics/time-to-hire').then((r) => r.data);
export const interviewerPerformance = () => client.get('/analytics/interviewer-performance').then((r) => r.data);
export const offerAcceptance = () => client.get('/analytics/offer-acceptance').then((r) => r.data);
