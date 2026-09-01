import { apiGet, apiPatch, apiPost } from './client';
import type { LoginResponse, RegisterResponse, User } from './types';

export const authApi = {
  login(username: string, password: string) {
    return apiPost<LoginResponse>('/auth/login', { username, password });
  },

  register(username: string, email: string, password: string, reason?: string) {
    return apiPost<RegisterResponse>('/auth/register', { username, email, password, reason });
  },

  me() {
    return apiGet<User>('/auth/me');
  },

  updateTTL(ttl: number) {
    return apiPatch<{ message: string; ttl: number }>('/auth/me/ttl', { ttl });
  },
};
