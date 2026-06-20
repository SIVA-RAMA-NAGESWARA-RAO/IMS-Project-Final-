import client from './client';

export const submitFeedback = (data) => client.post('/feedback', data).then((r) => r.data);
export const getFeedbackForInterview = (interviewId) =>
  client.get(`/feedback/interview/${interviewId}`).then((r) => r.data);
export const getFeedbackForApplication = (applicationId) =>
  client.get(`/feedback/application/${applicationId}`).then((r) => r.data);
