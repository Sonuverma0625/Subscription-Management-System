import { apiClient } from './client.js';

export const portalApi = {
  summary: () => apiClient.get('/portal/summary'),
  plans: () => apiClient.get('/portal/plans'),
  changePlan: (id, planId) => apiClient.post(`/portal/subscriptions/${id}/change-plan`, { planId }),
  pause: (id) => apiClient.post(`/portal/subscriptions/${id}/pause`),
  resume: (id) => apiClient.post(`/portal/subscriptions/${id}/resume`),
  renew: (id) => apiClient.post(`/portal/subscriptions/${id}/renew`),
  cancel: (id) => apiClient.post(`/portal/subscriptions/${id}/cancel`),
};
