import { apiDelete, apiGet, apiPost } from './client';
import type { Webhook } from './types';

export interface DuplicateGroupHeader {
  bodyHash: string;
  count: number;
  firstReceiptId: string;
  lastReceiptId: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  bodyPreview: string;
}

export interface DuplicateReceipt {
  receiptId: string;
  timestamp?: string;
}

export interface DuplicateGroupDetail {
  bodyHash: string;
  count: number;
  body: unknown;
  firstReceiptId: string;
  lastReceiptId: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  offset: number;
  limit: number;
  receiptsTotal: number;
  receipts: DuplicateReceipt[];
}

export interface SearchResult {
  mode: 'exact' | 'substring';
  total: number;
  offset: number;
  limit: number;
  matches: Array<{ receiptId: string; body: unknown; timestamp?: string }>;
}

export const webhooksApi = {
  list(roomId: string) {
    return apiGet<Webhook[]>(`/hook/all/${roomId}`);
  },

  // Как оригинальная кнопка "Отправить тест" — шлёт синтетический пейлоад на
  // собственный публичный ингест-эндпоинт комнаты (без авторизации, /hook/*).
  sendTest(roomId: string) {
    return apiPost(`/hook/${roomId}`, {
      message: 'Тестовый вебхук',
      time: new Date().toISOString(),
      randomValue: Math.random().toString(36).slice(2, 9),
      nested: {
        level1: {
          level2: 'Глубокое значение',
          array: [1, 2, 3, 4, 5],
        },
      },
    });
  },

  get(roomId: string, receiptId: string) {
    return apiGet<Webhook>(`/hook/${roomId}/${receiptId}`);
  },

  remove(roomId: string, receiptId: string) {
    return apiDelete<{ status: string }>(`/hook/${roomId}/${receiptId}`);
  },

  clear(roomId: string) {
    return apiDelete<{ status: string }>(`/hook/delete/${roomId}`);
  },

  duplicatesSummary(roomId: string, page = 1, pageSize = 20) {
    return apiGet<{
      roomId: string;
      page: number;
      totalPages: number;
      totalGroups: number;
      totalDuplicateWebhooks: number;
      totalWebhooks: number;
      groups: DuplicateGroupHeader[];
    }>(`/hook/${roomId}/duplicates/summary?page=${page}&pageSize=${pageSize}`);
  },

  duplicateGroup(roomId: string, bodyHash: string, offset = 0, limit = 100) {
    return apiGet<DuplicateGroupDetail>(
      `/hook/${roomId}/duplicates/group/${bodyHash}?offset=${offset}&limit=${limit}`
    );
  },

  search(roomId: string, mode: 'exact' | 'substring', query: string, offset = 0, limit = 50) {
    return apiPost<SearchResult>(`/hook/${roomId}/search`, { mode, query, offset, limit });
  },
};
