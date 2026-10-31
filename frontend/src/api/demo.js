import { apiClient } from './client.js';

export const demoApi = {
  list: (params) => apiClient.get('/demo-requests', { params }),
  updateStatus: (id, status) => apiClient.patch(`/demo-requests/${id}/status`, { status }),
};
