import { Info } from '@phosphor-icons/react';
import { Modal } from '../../components/Modal/Modal';
import { MethodBadge } from '../../components/MethodBadge/MethodBadge';
import { JsonView } from '../../components/JsonView/JsonView';
import { useI18n } from '../../i18n/I18nContext';
import type { Webhook } from '../../api/types';
import styles from './WebhookDetailsModal.module.scss';

export function WebhookDetailsModal({ webhook, onClose }: { webhook: Webhook; onClose: () => void }) {
  const { t } = useI18n();
  const metadata = webhook.metadata;
  const headers = metadata?.headers ?? {};
  const query = metadata?.query ?? {};
  const method = metadata?.method ?? 'POST';

  return (
    <Modal title={t.room.details.title} icon={<Info size={20} />} onClose={onClose}>
      <div className={styles.infoGrid}>
        <div>
          <p className={styles.label}>{t.room.details.method}</p>
          <MethodBadge method={method} />
        </div>
        <div>
          <p className={styles.label}>{t.room.details.id}</p>
          <code className={styles.mono}>{webhook.receiptId}</code>
        </div>
        <div>
          <p className={styles.label}>{t.room.details.hostIp}</p>
          <div className={styles.ipRow}>
            <code className={styles.mono}>{metadata?.ip ?? 'unknown'}</code>
            {metadata?.ip && metadata.ip !== 'unknown' && (
              <a href={`https://www.whois.com/whois/${metadata.ip}`} target="_blank" rel="noreferrer">
                {t.room.details.whois}
              </a>
            )}
          </div>
        </div>
        <div>
          <p className={styles.label}>{t.room.details.date}</p>
          <p className={styles.value}>{formatTimestamp(webhook.timestamp)}</p>
        </div>
        <div className={styles.spanTwo}>
          <p className={styles.label}>{t.room.details.url}</p>
          <code className={`${styles.mono} ${styles.block}`}>{metadata?.url ?? 'N/A'}</code>
        </div>
      </div>

      <section>
        <h4 className={styles.sectionTitle}>{t.room.details.headers}</h4>
        <MetaRows entries={headers} emptyLabel={t.room.details.empty} />
      </section>

      <section>
        <h4 className={styles.sectionTitle}>{t.room.details.queryStrings}</h4>
        <MetaRows entries={query} emptyLabel={t.room.details.empty} />
      </section>

      <section>
        <h4 className={styles.sectionTitle}>{t.room.details.body}</h4>
        {webhook.body && Object.keys(webhook.body as object).length > 0 ? (
          <JsonView value={webhook.body} />
        ) : (
          <p className={styles.emptyNote}>{t.room.details.noBody}</p>
        )}
      </section>
    </Modal>
  );
}

function MetaRows({ entries, emptyLabel }: { entries: Record<string, string | string[]>; emptyLabel: string }) {
  const pairs = Object.entries(entries);

  if (pairs.length === 0) {
    return <p className={styles.emptyNote}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.metaRows}>
      {pairs.map(([key, value]) => (
        <div key={key} className={styles.metaRow}>
          <code className={styles.metaKey}>{key}</code>
          <code className={styles.metaValue}>{Array.isArray(value) ? value.join(', ') : value}</code>
        </div>
      ))}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
