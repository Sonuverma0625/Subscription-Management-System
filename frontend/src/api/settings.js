import { apiClient } from './client.js';

export const settingsApi = {
  getCompany: () => apiClient.get('/settings/company'),
  updateCompany: (body) => apiClient.put('/settings/company', body),
};
