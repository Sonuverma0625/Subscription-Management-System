import { apiClient } from './client.js';

export const invoicesApi = {
  list: (params) => apiClient.get('/invoices', { params }),
  get: (id) => apiClient.get(`/invoices/${id}`),
  generate: (subscriptionId) => apiClient.post(`/invoices/generate/${subscriptionId}`),
  runBilling: () => apiClient.post('/invoices/run-billing'),
  confirm: (id) => apiClient.post(`/invoices/${id}/confirm`),
  cancel: (id) => apiClient.post(`/invoices/${id}/cancel`),
  send: (id) => apiClient.post(`/invoices/${id}/send`),
  pdf: (id) => apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};
