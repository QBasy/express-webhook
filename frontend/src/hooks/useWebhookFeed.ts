import { useEffect, useRef, useState } from 'react';
import { webhooksApi } from '../api/webhooks';
import { ApiError } from '../api/client';
import type { Webhook } from '../api/types';

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

export type SortOrder = 'newest' | 'oldest';

export interface WebhookFeedOptions {
  offset: number;
  limit: number;
  order: SortOrder;
  // Держать ли реальное SSE-соединение. По умолчанию true — единичный embed
  // (обычная страница/один iframe) как и раньше живой. false — только
  // постраничная выборка без стрима: нужно для инструмента тестирования
  // множественных одновременных iframe-превью (см. IframeTestPage), где N
  // одновременно открытых EventSource на один origin упираются в лимит
  // браузера на конкурентные соединения (6 на HTTP/1.1) и вешают вообще все
  // остальные запросы к тому же origin, включая обычный fetch пагинации.
  live?: boolean;
}

export interface WebhookFeed {
  webhooks: Webhook[] | null;
  total: number;
  isOnline: boolean;
  reconnectAttempts: number;
  notFound: boolean;
  newCount: number;
  removeLocal: (receiptId: string) => void;
  refresh: () => void;
}

interface StreamEventPayload {
  webhook: Webhook;
  deleted: { receiptId: string };
  cleared: Record<string, never>;
}

function parseEventData<T>(event: Event): T {
  return JSON.parse((event as MessageEvent).data) as T;
}

// Живое обновление списка вебхуков через SSE (/hook/:id/stream) вместо
// полного передопроса каждые 2с (как было раньше): сервер сам присылает
// webhook/deleted/cleared события, а сама выборка — через настоящую
// server-side пагинацию (/hook/:id/page). SSE-соединение живёт на уровне
// комнаты и не пересоздаётся при смене страницы/сортировки — только
// перезагружается текущая страница.
export function useWebhookFeed(roomId: string, reloadKey: number, opts: WebhookFeedOptions): WebhookFeed {
  const { offset, limit, order, live = true } = opts;
  const optsKey = `${offset}:${limit}:${order}`;

  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null);
  const [total, setTotal] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const lastEventAtRef = useRef<string | null>(null);
  // Актуальные offset/limit/order для SSE-обработчиков: сам SSE-эффект не
  // пересоздаётся при пагинации/сортировке (см. ниже), поэтому обработчики
  // читают их из рефов, а не из замыкания — иначе использовали бы устаревшие
  // значения с момента открытия соединения.
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const orderRef = useRef(order);
  orderRef.current = order;
  const limitRef = useRef(limit);
  limitRef.current = limit;

  // Сброс состояния при смене комнаты/reloadKey — новый контекст, старые
  // данные и курсор SSE-догона больше не актуальны.
  useEffect(() => {
    setWebhooks(null);
    setTotal(0);
    setNotFound(false);
    setNewCount(0);
    setReady(false);
    lastEventAtRef.current = null;
  }, [roomId, reloadKey]);

  // Загрузка текущей страницы.
  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        const page = await webhooksApi.page(roomId, { offset, limit, order });
        if (cancelled) return;
        setWebhooks(page.webhooks);
        setTotal(page.total);
        setNotFound(false);
        setNewCount(0);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          setWebhooks([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, reloadKey, optsKey, refreshTick]);

  // Персистентное SSE-соединение на комнату — открывается один раз, после
  // первой успешной/404 загрузки страницы (чтобы не долбить stream для
  // заведомо несуществующей комнаты, пока это не выяснится).
  useEffect(() => {
    if (!ready || notFound || !live) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let attempts = 0;

    function applyWebhookEvent(webhook: Webhook): void {
      lastEventAtRef.current = webhook.createdAt;
      setTotal((t) => t + 1);

      if (offsetRef.current === 0 && orderRef.current === 'newest') {
        setWebhooks((prev) => {
          if (prev === null) return prev;
          const next = [webhook, ...prev.filter((w) => w.receiptId !== webhook.receiptId)];
          return next.slice(0, limitRef.current);
        });
        return;
      }

      setNewCount((n) => n + 1);
    }

    function connect() {
      if (lastEventAtRef.current === null) {
        lastEventAtRef.current = new Date().toISOString();
      }
      const since = attempts > 0 ? lastEventAtRef.current ?? undefined : undefined;
      es = new EventSource(webhooksApi.streamUrl(roomId, since));

      es.addEventListener('open', () => {
        if (cancelled) return;
        setIsOnline(true);
        attempts = 0;
        setReconnectAttempts(0);
      });

      es.addEventListener('webhook', (event) => {
        if (cancelled) return;
        applyWebhookEvent(parseEventData<StreamEventPayload['webhook']>(event));
      });

      es.addEventListener('deleted', (event) => {
        if (cancelled) return;
        const { receiptId } = parseEventData<StreamEventPayload['deleted']>(event);
        setWebhooks((prev) => (prev ? prev.filter((w) => w.receiptId !== receiptId) : prev));
        setTotal((t) => Math.max(0, t - 1));
      });

      es.addEventListener('cleared', () => {
        if (cancelled) return;
        setWebhooks([]);
        setTotal(0);
        setNewCount(0);
      });

      es.onerror = () => {
        if (cancelled) return;
        es?.close();
        setIsOnline(false);
        attempts += 1;
        setReconnectAttempts(attempts);
        const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      es?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, reloadKey, ready, notFound, live]);

  function removeLocal(receiptId: string): void {
    setWebhooks((prev) => (prev ? prev.filter((w) => w.receiptId !== receiptId) : prev));
    setTotal((t) => Math.max(0, t - 1));
  }

  function refresh(): void {
    setRefreshTick((n) => n + 1);
  }

  return { webhooks, total, isOnline, reconnectAttempts, notFound, newCount, removeLocal, refresh };
}
