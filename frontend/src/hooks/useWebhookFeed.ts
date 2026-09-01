import { useEffect, useRef, useState } from 'react';
import { webhooksApi } from '../api/webhooks';
import type { Webhook } from '../api/types';

const POLL_INTERVAL_MS = 2000;
const MAX_BACKOFF_MS = 30000;

export interface WebhookFeed {
  webhooks: Webhook[] | null;
  isOnline: boolean;
  reconnectAttempts: number;
}

// Живое обновление списка вебхуков — как в оригинальном main-script.js
// (setInterval на 2с), но с экспоненциальным backoff при обрыве связи вместо
// долбёжки сервера каждые 2с, и с полной заменой списка вместо ручного
// накопления на клиенте (сервер и так уже возвращает актуальный список).
export function useWebhookFeed(roomId: string, reloadKey: number): WebhookFeed {
  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let attempts = 0;

    async function poll() {
      try {
        const list = await webhooksApi.list(roomId);
        if (cancelled) return;
        setWebhooks(list);
        setIsOnline(true);
        attempts = 0;
        setReconnectAttempts(0);
        wasOfflineRef.current = false;
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setIsOnline(false);
        wasOfflineRef.current = true;
        attempts += 1;
        setReconnectAttempts(attempts);
        const delay = Math.min(1000 * 2 ** attempts, MAX_BACKOFF_MS);
        timeoutId = setTimeout(poll, delay);
      }
    }

    setWebhooks(null);
    setIsOnline(true);
    setReconnectAttempts(0);
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [roomId, reloadKey]);

  return { webhooks, isOnline, reconnectAttempts };
}
