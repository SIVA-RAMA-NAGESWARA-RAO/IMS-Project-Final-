import client from './client';

export const register = (data) => client.post('/auth/register', data).then((r) => r.data);
export const verifyOtp = (email, code) => client.post('/auth/verify-otp', { email, code }).then((r) => r.data);
export const resendOtp = (email, purpose) => client.post('/auth/resend-otp', { email, purpose }).then((r) => r.data);
export const login = (data) => client.post('/auth/login', data).then((r) => r.data);
export const refresh = () => client.post('/auth/refresh').then((r) => r.data);
export const logout = () => client.post('/auth/logout').then((r) => r.data);
export const logoutAll = () => client.post('/auth/logout-all').then((r) => r.data);
export const getMe = () => client.get('/auth/me').then((r) => r.data);
export const forgotPassword = (email) => client.post('/auth/forgot-password', { email }).then((r) => r.data);
export const resetPassword = (email, code, newPassword) =>
  client.post('/auth/reset-password', { email, code, newPassword }).then((r) => r.data);
