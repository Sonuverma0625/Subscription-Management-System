import { apiClient } from './client.js';

export const publicApi = {
  requestDemo: (body) => apiClient.post('/demo-requests', body),
};
