import client from './client';

// ─── Interview Templates (Kits) API ─────────────────────────────────────────

export const createTemplate = (data) =>
  client.post('/templates', data).then((r) => r.data);

export const listTemplates = (params = {}) =>
  client.get('/templates', { params }).then((r) => r.data);

export const getTemplate = (id) =>
  client.get(`/templates/${id}`).then((r) => r.data);

export const updateTemplate = (id, data) =>
  client.put(`/templates/${id}`, data).then((r) => r.data);

export const deleteTemplate = (id) =>
  client.delete(`/templates/${id}`).then((r) => r.data);
