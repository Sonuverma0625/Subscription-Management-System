import { apiClient } from './client.js';

export const notificationsApi = {
  list: (params) => apiClient.get('/notifications', { params }),
  read: (id) => apiClient.patch(`/notifications/${id}/read`),
  readAll: () => apiClient.post('/notifications/read-all'),
};
