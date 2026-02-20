import { apiClient } from './client';
import type { User, AuthResponse, RegisterRequest, RegisterResponse, LoginRequest } from '../../types/vehicle';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    return apiClient.post<RegisterResponse>('/auth/register', data);
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/refresh');
  },

  me: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },
};
