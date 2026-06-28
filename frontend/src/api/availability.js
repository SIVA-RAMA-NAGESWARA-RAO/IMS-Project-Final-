import client from './client';

// ─── Availability / Self-Scheduling API ─────────────────────────────────────

export const publishSlots = (slots) =>
  client.post('/availability', { slots }).then((r) => r.data);

export const getAvailableSlots = (params = {}) =>
  client.get('/availability', { params }).then((r) => r.data);

export const getMySlots = () =>
  client.get('/availability/me').then((r) => r.data);

export const bookSlot = (slotId, interviewId) =>
  client.patch(`/availability/${slotId}/book`, { interviewId }).then((r) => r.data);

export const deleteSlot = (slotId) =>
  client.delete(`/availability/${slotId}`).then((r) => r.data);
