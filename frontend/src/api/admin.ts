import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type { User } from './types';

export const adminApi = {
  users() {
    return apiGet<{ users: User[] }>('/admin/users');
  },

  approve(userId: string) {
    return apiPost<{ message: string }>(`/admin/users/${userId}/approve`);
  },

  reject(userId: string, reason?: string) {
    return apiPost<{ message: string }>(`/admin/users/${userId}/reject`, { reason });
  },

  remove(userId: string) {
    return apiDelete<{ message: string }>(`/admin/users/${userId}`);
  },

  setTTL(userId: string, ttl: number) {
    return apiPatch<{ message: string; ttl: number }>(`/admin/users/${userId}/ttl`, { ttl });
  },

  stats() {
    return apiGet<{ users: Record<string, number>; rooms: number; webhooks: number }>('/admin/stats');
  },
};
