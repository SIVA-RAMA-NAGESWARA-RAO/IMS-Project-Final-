import client from './client';

export const listInterviewers = () => client.get('/interviewers').then((r) => r.data);
export const assignInterviewers = (interviewId, interviewerIds) =>
  client.patch(`/interviewers/assign/${interviewId}`, { interviewerIds }).then((r) => r.data);
export const trackAssignments = (id) => client.get(`/interviewers/${id}/assignments`).then((r) => r.data);
