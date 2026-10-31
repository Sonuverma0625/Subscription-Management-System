import { apiClient } from './client.js';

async function list(path, params) { return apiClient.get(path, { params }); }

export const catalogApi = {
  products: (params) => list('/products', params),
  createProduct: (body) => apiClient.post('/products', body),
  updateProduct: (id, body) => apiClient.patch(`/products/${id}`, body),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`),
  createVariant: (productId, body) => apiClient.post(`/products/${productId}/variants`, body),
  updateVariant: (productId, variantId, body) => apiClient.patch(`/products/${productId}/variants/${variantId}`, body),
  deleteVariant: (productId, variantId) => apiClient.delete(`/products/${productId}/variants/${variantId}`),
  plans: (params) => list('/plans', params),
  createPlan: (body) => apiClient.post('/plans', body),
  updatePlan: (id, body) => apiClient.patch(`/plans/${id}`, body),
  deletePlan: (id) => apiClient.delete(`/plans/${id}`),
  taxes: (params) => list('/taxes', params),
  createTax: (body) => apiClient.post('/taxes', body),
  updateTax: (id, body) => apiClient.patch(`/taxes/${id}`, body),
  deleteTax: (id) => apiClient.delete(`/taxes/${id}`),
  discounts: (params) => list('/discounts', params),
  createDiscount: (body) => apiClient.post('/discounts', body),
  updateDiscount: (id, body) => apiClient.patch(`/discounts/${id}`, body),
  deleteDiscount: (id) => apiClient.delete(`/discounts/${id}`),
  templates: (params) => list('/templates', params),
  createTemplate: (body) => apiClient.post('/templates', body),
  updateTemplate: (id, body) => apiClient.patch(`/templates/${id}`, body),
  deleteTemplate: (id) => apiClient.delete(`/templates/${id}`),
  customers: (params) => list('/customers', params),
};
