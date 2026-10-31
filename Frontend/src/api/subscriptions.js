import { apiClient } from './client.js';

export const subscriptionsApi = {
  list: (params) => apiClient.get('/subscriptions', { params }),
  get: (id) => apiClient.get(`/subscriptions/${id}`),
  create: (body) => apiClient.post('/subscriptions', body),
  createFromTemplate: (templateId, body) => apiClient.post(`/subscriptions/from-template/${templateId}`, body),
  update: (id, body) => apiClient.patch(`/subscriptions/${id}`, body),
  delete: (id) => apiClient.delete(`/subscriptions/${id}`),
  quotation: (id) => apiClient.post(`/subscriptions/${id}/quotation`),
  confirm: (id) => apiClient.post(`/subscriptions/${id}/confirm`),
  activate: (id) => apiClient.post(`/subscriptions/${id}/activate`),
  pause: (id) => apiClient.post(`/subscriptions/${id}/pause`),
  resume: (id) => apiClient.post(`/subscriptions/${id}/resume`),
  renew: (id, periods = 1) => apiClient.post(`/subscriptions/${id}/renew`, { periods }),
  close: (id) => apiClient.post(`/subscriptions/${id}/close`),
};
