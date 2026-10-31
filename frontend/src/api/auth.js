import { apiClient } from './client.js';

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  logout: () => apiClient.post('/auth/logout'),
  refresh: () => apiClient.post('/auth/refresh'),
  me: () => apiClient.get('/auth/me'),
  forgotPassword: (payload) => apiClient.post('/auth/forgot-password', payload),
  resetPassword: (token, payload) => apiClient.post(`/auth/reset-password/${encodeURIComponent(token)}`, payload),
};
