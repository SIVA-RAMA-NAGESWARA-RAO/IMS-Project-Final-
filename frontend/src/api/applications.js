import client from './client';

export const applyToJob = (data) => client.post('/applications', data).then((r) => r.data);
export const myApplications = () => client.get('/applications/mine').then((r) => r.data);
export const listApplications = (params) => client.get('/applications', { params }).then((r) => r.data);
export const getApplication = (id) => client.get(`/applications/${id}`).then((r) => r.data);
export const updateApplicationStatus = (id, status, note) =>
  client.patch(`/applications/${id}/status`, { status, note }).then((r) => r.data);
