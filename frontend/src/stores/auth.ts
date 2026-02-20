import { create } from 'zustand';
import type { User, RegisterRequest } from '../types/vehicle';
import { authApi } from '../lib/api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  showAuthModal: boolean;
  authModalTab: 'login' | 'register';
  registeredEmail: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: 'login' | 'register') => void;
  clearRegisteredEmail: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  showAuthModal: false,
  authModalTab: 'login',
  registeredEmail: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      set({ user: response.user, isAuthenticated: true, isLoading: false, showAuthModal: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed', isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      if (response.email_verification_sent) {
        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          registeredEmail: response.email,
          showAuthModal: true,
        });
      } else {
        set({ user: response.user, isAuthenticated: true, isLoading: false, showAuthModal: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Registration failed', isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  openAuthModal: (tab = 'login') => set({ showAuthModal: true, authModalTab: tab, error: null }),
  closeAuthModal: () => set({ showAuthModal: false, error: null }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
  clearRegisteredEmail: () => set({ registeredEmail: null, showAuthModal: false }),
}));
