import { apiClient } from './client.js';

export const reportsApi = {
  summary: (params) => apiClient.get('/reports/summary', { params }),
  revenue: (params) => apiClient.get('/reports/revenue', { params }),
  overdue: (params) => apiClient.get('/reports/overdue', { params }),
  activeSubscriptions: (params) => apiClient.get('/reports/active-subscriptions', { params }),
  payments: (params) => apiClient.get('/reports/payments', { params }),
  exportCsv: (params) => apiClient.get('/reports/export.csv', { params, responseType: 'blob' }),
};
