import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowClockwise, CaretLeft, CaretRight, Check, Clock, Copy, DownloadSimple, Trash } from '@phosphor-icons/react';
import { webhooksApi } from '../../api/webhooks';
import type { Webhook } from '../../api/types';
import { useI18n } from '../../i18n/I18nContext';
import { useClipboard } from '../../hooks/useClipboard';
import { useWebhookFeed, type SortOrder } from '../../hooks/useWebhookFeed';
import { useToast } from '../../toast/ToastContext';
import { JsonView } from '../../components/JsonView/JsonView';
import { MethodBadge } from '../../components/MethodBadge/MethodBadge';
import { CopyToast } from '../../components/CopyToast/CopyToast';
import { ConnectionStatus } from '../../components/ConnectionStatus/ConnectionStatus';
import { WebhookDetailsModal } from './WebhookDetailsModal';
import styles from './WebhookList.module.scss';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export function WebhookList({
  roomId,
  reloadKey,
  readOnly = false,
  live = true,
}: {
  roomId: string;
  reloadKey: number;
  readOnly?: boolean;
  live?: boolean;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const wasOnlineRef = useRef(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [roomId, reloadKey, sortOrder, itemsPerPage]);

  const offset = (currentPage - 1) * itemsPerPage;
  const { webhooks, total, isOnline, reconnectAttempts, notFound, newCount, removeLocal, refresh } = useWebhookFeed(
    roomId,
    reloadKey,
    { offset, limit: itemsPerPage, order: sortOrder, live }
  );

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Тост при восстановлении соединения — как оригинальный showAlert("Соединение
  // восстановлено") внутри attemptReconnect. О потере связи отдельно не сообщаем:
  // это и так видно по индикатору (он трясётся), плюс не хотим спамить тостами
  // при каждой неудачной попытке переподключения.
  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      showToast(t.room.connection.restored, 'success');
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, showToast, t]);

  async function handleDelete(receiptId: string) {
    try {
      await webhooksApi.remove(roomId, receiptId);
      // Оптимистично убираем из вида сразу, не дожидаясь SSE-эха собственного
      // удаления (как оригинальный allHooks.filter(...) + renderAllWebhooks()).
      removeLocal(receiptId);
      setDetailsId((prev) => (prev === receiptId ? null : prev));
      showToast(t.room.list.deleted, 'success');
    } catch {
      showToast(t.room.list.deleteError, 'error');
    }
  }

  async function handleDownload() {
    try {
      const all = await webhooksApi.list(roomId);
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `webhooks_${roomId}_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t.room.list.downloadError, 'error');
    }
  }

  function handleShowNew() {
    if (currentPage !== 1 || sortOrder !== 'newest') {
      setSortOrder('newest');
      setCurrentPage(1);
    } else {
      refresh();
    }
  }

  if (notFound) {
    return <p className={styles.state}>{t.room.list.notFound}</p>;
  }

  if (webhooks === null) {
    return <p className={styles.state}>{t.common.loading}</p>;
  }

  const detailsWebhook = webhooks.find((w) => w.receiptId === detailsId) ?? null;

  return (
    <div>
      <div className={styles.toolbar}>
        <ConnectionStatus isOnline={isOnline} reconnectAttempts={reconnectAttempts} />

        <div className={styles.toolbarControls}>
          {newCount > 0 && (
            <button type="button" className={styles.newBadge} onClick={handleShowNew}>
              <ArrowClockwise size={14} /> {t.room.list.newAvailable(newCount)}
            </button>
          )}

          <select
            className={styles.select}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            aria-label={t.room.list.sortNewest}
          >
            <option value="newest">{t.room.list.sortNewest}</option>
            <option value="oldest">{t.room.list.sortOldest}</option>
          </select>

          <select
            className={styles.select}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            aria-label="items-per-page"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {t.room.list.itemsPerPageLabel(n)}
              </option>
            ))}
          </select>

          <button type="button" onClick={handleDownload}>
            <DownloadSimple size={16} /> {t.room.list.download}
          </button>
        </div>
      </div>

      {total === 0 ? (
        <p className={styles.state}>{t.room.list.empty}</p>
      ) : (
        <>
          <p className={styles.shownOf}>{t.room.list.shownOf(webhooks.length, total)}</p>

          <ul className={styles.list}>
            {webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.receiptId}
                webhook={webhook}
                readOnly={readOnly}
                onOpenDetails={() => setDetailsId(webhook.receiptId)}
                onDelete={() => handleDelete(webhook.receiptId)}
              />
            ))}
          </ul>

          <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
        </>
      )}

      {detailsWebhook && <WebhookDetailsModal webhook={detailsWebhook} onClose={() => setDetailsId(null)} />}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const pages = buildPageList(page, totalPages);

  return (
    <div className={styles.pagination}>
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <CaretLeft size={14} /> {t.room.list.prev}
      </button>

      <div className={styles.pageNumbers}>
        {pages.map((p, index) =>
          p === '...' ? (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={p === page ? styles.pageActive : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        {t.room.list.next} <CaretRight size={14} />
      </button>
    </div>
  );
}

// Портировано 1:1 из оригинального renderPagination в main-script.js.
function buildPageList(current: number, total: number): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function WebhookCard({
  webhook,
  readOnly,
  onOpenDetails,
  onDelete,
}: {
  webhook: Webhook;
  readOnly: boolean;
  onOpenDetails: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const { copied, copy, toast } = useClipboard();
  const method = webhook.metadata?.method ?? 'POST';

  function handleCopyAll(event: MouseEvent) {
    copy(JSON.stringify(webhook.body, null, 2), event);
  }

  return (
    <li className={styles.card}>
      <CopyToast toast={toast} />
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <button type="button" className={styles.receiptId} onClick={onOpenDetails} title={t.room.list.openDetails}>
            ID: {webhook.receiptId}
          </button>
          <MethodBadge method={method} />
          <span className={styles.timestamp}>
            <Clock size={12} />
            {formatTimestamp(webhook.timestamp)}
          </span>
        </div>
        <div className={styles.cardActions}>
          <button type="button" className={styles.actionBtn} onClick={handleCopyAll}>
            {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
            {t.common.copy}
          </button>
          {!readOnly && (
            <button type="button" className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={onDelete}>
              <Trash size={15} />
              {t.room.list.delete}
            </button>
          )}
        </div>
      </div>

      <JsonView value={webhook.body} />

      <p className={styles.hint}>{t.room.list.hint}</p>
    </li>
  );
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
