import client from './client';

export const getMyCandidateProfile = () => client.get('/candidates/me').then((r) => r.data);
export const upsertMyCandidateProfile = (data) => client.put('/candidates/me', data).then((r) => r.data);
export const uploadResumeUrl = (resumeUrl) => client.post('/candidates/me/resume', { resumeUrl }).then((r) => r.data);
export const listCandidates = (params) => client.get('/candidates', { params }).then((r) => r.data);

// Real file uploads, streamed to Cloudinary server-side (Module 2).
export const uploadResumeFile = (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  return client.post('/candidates/me/resume/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
};

export const uploadDocumentFile = (file) => {
  const formData = new FormData();
  formData.append('document', file);
  return client.post('/candidates/me/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
};
