import { apiClient } from './client.js';

export const auditApi = {
  list: (params) => apiClient.get('/audit-logs', { params }),
};
