import { useEffect, useState } from 'react';
import { WarningOctagon } from '@phosphor-icons/react';
import { roomsApi } from '../../api/rooms';
import { useI18n } from '../../i18n/I18nContext';
import { Badge } from '../../components/Badge/Badge';
import styles from './FakeErrorPanel.module.scss';

export function FakeErrorPanel({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [statusCode, setStatusCode] = useState(500);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    roomsApi.getFakeError(roomId).then((status) => {
      if (cancelled) return;
      setEnabled(status.enabled);
      if (status.statusCode) setStatusCode(status.statusCode);
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  async function toggle() {
    setIsBusy(true);
    try {
      const next = !enabled;
      const result = await roomsApi.setFakeError(roomId, next, statusCode);
      setEnabled(result.enabled);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <WarningOctagon size={18} />
        <strong>{t.room.fakeError.title}</strong>
        <Badge variant={enabled ? 'error' : 'success'}>
          {enabled ? t.room.header.fakeError : t.room.header.normal}
        </Badge>
      </div>
      <p className={styles.description}>{t.room.fakeError.description}</p>
      <div className={styles.controls}>
        <label>
          {t.room.fakeError.statusCode}
          <input
            type="number"
            min={100}
            max={599}
            value={statusCode}
            onChange={(e) => setStatusCode(Number(e.target.value) || 500)}
            disabled={enabled}
          />
        </label>
        <button type="button" className={enabled ? styles.disableBtn : styles.enableBtn} onClick={toggle} disabled={isBusy}>
          {enabled ? t.room.fakeError.disable : t.room.fakeError.enable}
        </button>
      </div>
    </div>
  );
}
