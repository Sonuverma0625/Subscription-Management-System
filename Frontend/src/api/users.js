import { apiClient } from './client.js';

export const usersApi = {
  listStaff: (params) => apiClient.get('/users', { params }),
  createStaff: (payload) => apiClient.post('/users', payload),
  setStaffActive: (id, isActive) => apiClient.patch(`/users/${encodeURIComponent(id)}/active`, { isActive }),
};

