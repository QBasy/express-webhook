import { apiDelete, apiGet, apiPost } from './client';
import type { FakeErrorStatus, ForwardingStatus, Room } from './types';

export const roomsApi = {
  create(roomId: string) {
    return apiPost<{ roomId: string; webhookUrl: string; webhookTTL: number }>(`/room/${roomId}`);
  },

  myRooms() {
    return apiGet<{ rooms: Room[] }>('/room/my-rooms');
  },

  allRooms() {
    return apiGet<{ rooms: Array<{ roomId: string; webhooksCount: number }> }>('/room/all');
  },

  close(roomId: string) {
    return apiDelete<{ message: string; roomId: string }>(`/room/${roomId}`);
  },

  getFakeError(roomId: string) {
    return apiGet<FakeErrorStatus & { roomId: string }>(`/room/${roomId}/fake-error`);
  },

  setFakeError(roomId: string, enabled: boolean, statusCode?: number) {
    return apiPost<FakeErrorStatus & { roomId: string; message: string }>(`/room/${roomId}/fake-error`, {
      enabled,
      statusCode,
    });
  },

  getForwarding(roomId: string) {
    return apiGet<ForwardingStatus & { roomId: string }>(`/room/${roomId}/forward`);
  },

  setForwarding(roomId: string, enabled: boolean, url?: string) {
    return apiPost<ForwardingStatus & { roomId: string; message: string }>(`/room/${roomId}/forward`, {
      enabled,
      url,
    });
  },
};
