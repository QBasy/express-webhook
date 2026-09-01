import { useEffect, useState, type FormEvent } from 'react';
import { ShareNetwork } from '@phosphor-icons/react';
import { roomsApi } from '../../api/rooms';
import { useI18n } from '../../i18n/I18nContext';
import { Badge } from '../../components/Badge/Badge';
import { Alert } from '../../components/Alert/Alert';
import styles from './ForwardPanel.module.scss';

export function ForwardPanel({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    roomsApi.getForwarding(roomId).then((status) => {
      if (cancelled) return;
      setEnabled(status.enabled);
      if (status.url) setUrl(status.url);
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  async function handleToggle(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const next = !enabled;
    if (next && !url.trim()) {
      setError(t.room.forward.urlRequired);
      return;
    }

    setIsBusy(true);
    try {
      const result = await roomsApi.setForwarding(roomId, next, url.trim());
      setEnabled(result.enabled);
    } catch {
      setError(t.room.forward.urlRequired);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <ShareNetwork size={18} />
        <strong>{t.room.forward.title}</strong>
        <Badge variant={enabled ? 'success' : 'neutral'}>
          {enabled ? t.room.forward.active : t.room.forward.inactive}
        </Badge>
      </div>
      <p className={styles.description}>{t.room.forward.description}</p>
      {error && <Alert type="error" message={error} />}
      <form className={styles.controls} onSubmit={handleToggle}>
        <label>
          {t.room.forward.urlLabel}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.room.forward.urlPlaceholder}
            disabled={enabled}
          />
        </label>
        <button type="submit" className={enabled ? styles.disableBtn : styles.enableBtn} disabled={isBusy}>
          {enabled ? t.room.forward.disable : t.room.forward.enable}
        </button>
      </form>
    </div>
  );
}
