import { create } from 'zustand';
import { authApi } from '../api/auth.js';
import { setAccessToken } from '../api/client.js';

let initializationPromise = null;

export const useAuthStore = create((set) => ({
  user: null,
  initialized: false,
  setSession: ({ user, accessToken }) => {
    setAccessToken(accessToken);
    set({ user, initialized: true });
  },
  clearSession: () => {
    setAccessToken(null);
    set({ user: null, initialized: true });
  },
  initialize: () => {
    if (!initializationPromise) {
      initializationPromise = (async () => {
        try {
          const { data } = await authApi.refresh();
          setAccessToken(data.data.accessToken);
          set({ user: data.data.user, initialized: true });
        } catch {
          setAccessToken(null);
          set({ user: null, initialized: true });
        } finally {
          initializationPromise = null;
        }
      })();
    }
    return initializationPromise;
  },
  login: async (credentials) => {
    const { data } = await authApi.login(credentials);
    setAccessToken(data.data.accessToken);
    set({ user: data.data.user, initialized: true });
    return data.data.user;
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({ user: null, initialized: true });
    }
  },
}));
