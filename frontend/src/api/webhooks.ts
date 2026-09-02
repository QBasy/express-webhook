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

export interface WebhookPage {
  roomId: string;
  offset: number;
  limit: number;
  order: 'newest' | 'oldest';
  total: number;
  webhooks: Webhook[];
}

export const webhooksApi = {
  list(roomId: string) {
    return apiGet<Webhook[]>(`/hook/all/${roomId}`);
  },

  // Настоящая server-side пагинация — в отличие от list() выше не тянет всю
  // историю комнаты, а отдаёт одну страницу + total для расчёта пагинации.
  page(roomId: string, opts: { offset: number; limit: number; order: 'newest' | 'oldest' }) {
    const params = new URLSearchParams({
      offset: String(opts.offset),
      limit: String(opts.limit),
      order: opts.order,
    });
    return apiGet<WebhookPage>(`/hook/${roomId}/page?${params.toString()}`);
  },

  // URL для EventSource: живой поток новых/удалённых вебхуков вместо опроса.
  // `since` (ISO-таймстемп) — догон событий, пропущенных во время реконнекта.
  streamUrl(roomId: string, since?: string) {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return `/hook/${roomId}/stream${query}`;
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
