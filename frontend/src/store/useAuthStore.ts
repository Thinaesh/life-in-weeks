import { create } from 'zustand';
import { api } from '../api';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  setAuth: (user: any) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,

  setAuth: (user) => set({ isAuthenticated: true, user }),

  checkAuth: async () => {
    try {
      const data = await api.get('/api/auth/me');
      set({ isAuthenticated: true, user: data });
      return true;
    } catch {
      set({ isAuthenticated: false, user: null });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout', {});
    } finally {
      set({ isAuthenticated: false, user: null });
      window.location.href = '/login';
    }
  }
}));
