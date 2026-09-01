import { useEffect, useState } from 'react';
import { CaretDown, CaretRight, CaretLeft } from '@phosphor-icons/react';
import { webhooksApi, type DuplicateGroupHeader, type DuplicateGroupDetail } from '../../api/webhooks';
import { useI18n } from '../../i18n/I18nContext';
import { JsonView } from '../../components/JsonView/JsonView';
import { Badge } from '../../components/Badge/Badge';
import styles from './DuplicatesPanel.module.scss';

interface Summary {
  page: number;
  totalPages: number;
  totalGroups: number;
  groups: DuplicateGroupHeader[];
}

export function DuplicatesPanel({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<DuplicateGroupDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    webhooksApi.duplicatesSummary(roomId, page).then((result) => {
      if (!cancelled) setSummary(result);
    });
    return () => {
      cancelled = true;
    };
  }, [roomId, page]);

  async function toggleGroup(hash: string) {
    if (expandedHash === hash) {
      setExpandedHash(null);
      setGroupDetail(null);
      return;
    }
    setExpandedHash(hash);
    setGroupDetail(null);
    const detail = await webhooksApi.duplicateGroup(roomId, hash);
    setGroupDetail(detail);
  }

  if (summary === null) {
    return <p className={styles.state}>{t.common.loading}</p>;
  }

  if (summary.groups.length === 0) {
    return <p className={styles.state}>{t.room.duplicates.empty}</p>;
  }

  return (
    <div>
      <ul className={styles.list}>
        {summary.groups.map((group) => {
          const isExpanded = expandedHash === group.bodyHash;
          return (
            <li key={group.bodyHash}>
              <button type="button" className={styles.row} onClick={() => toggleGroup(group.bodyHash)}>
                {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                <Badge variant="warning">{t.room.duplicates.count(group.count)}</Badge>
                <span className={styles.preview}>{group.bodyPreview}</span>
              </button>
              {isExpanded && (
                <div className={styles.detail}>
                  {groupDetail === null ? (
                    <p className={styles.state}>{t.common.loading}</p>
                  ) : (
                    <>
                      <div className={styles.meta}>
                        <span>
                          {t.room.duplicates.firstSeen}: {formatTimestamp(groupDetail.firstTimestamp)}
                        </span>
                        <span>
                          {t.room.duplicates.lastSeen}: {formatTimestamp(groupDetail.lastTimestamp)}
                        </span>
                      </div>
                      <JsonView value={groupDetail.body} />
                      <ul className={styles.receipts}>
                        {groupDetail.receipts.map((receipt) => (
                          <li key={receipt.receiptId}>
                            <span className={styles.receiptId}>{receipt.receiptId}</span>
                            <span className={styles.timestamp}>{formatTimestamp(receipt.timestamp)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {summary.totalPages > 1 && (
        <div className={styles.pagination}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <CaretLeft size={14} />
          </button>
          <span>
            {summary.page} / {summary.totalPages}
          </span>
          <button type="button" disabled={page >= summary.totalPages} onClick={() => setPage((p) => p + 1)}>
            <CaretRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
