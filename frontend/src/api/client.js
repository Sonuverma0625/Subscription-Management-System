import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({ baseURL, timeout: 15000, withCredentials: true });

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const requestPath = original?.url || '';
    const isAuthSubmission = /\/auth\/(login|register|refresh|logout|forgot-password|reset-password)/.test(requestPath);
    if (error.response?.status !== 401 || !original || original._retried || isAuthSubmission) {
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient.post('/auth/refresh')
          .then(({ data }) => {
            accessToken = data.data.accessToken;
            return accessToken;
          })
          .catch((refreshError) => {
            accessToken = null;
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('brightloop:session-expired'));
            throw refreshError;
          })
          .finally(() => { refreshPromise = null; });
      }
      const token = await refreshPromise;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
