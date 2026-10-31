import { apiClient } from './client.js';

export const paymentsApi = {
  list: (params) => apiClient.get('/payments', { params }),
  forInvoice: (invoiceId) => apiClient.get(`/payments/invoice/${invoiceId}`),
  create: (body) => apiClient.post('/payments', body),
  razorpayConfig: () => apiClient.get('/payments/razorpay/config'),
  createOrder: (body) => apiClient.post('/payments/razorpay/orders', body),
  verifyRazorpay: (body) => apiClient.post('/payments/razorpay/verify', body),
  reportRazorpayFailure: (body) => apiClient.post('/payments/razorpay/failure', body),
};
