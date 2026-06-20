import client from './client';

export const listInterviews = (params) => client.get('/interviews', { params }).then((r) => r.data);
export const scheduleInterview = (data) => client.post('/interviews', data).then((r) => r.data);
export const rescheduleInterview = (id, scheduledAt) =>
  client.patch(`/interviews/${id}/reschedule`, { scheduledAt }).then((r) => r.data);
export const cancelInterview = (id) => client.patch(`/interviews/${id}/cancel`).then((r) => r.data);
export const completeInterview = (id) => client.patch(`/interviews/${id}/complete`).then((r) => r.data);
