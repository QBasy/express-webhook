import { useEffect, useState } from 'react';
import { Database, SignIn, Stack } from '@phosphor-icons/react';
import { roomsApi } from '../../api/rooms';
import { useI18n } from '../../i18n/I18nContext';
import { Modal } from '../../components/Modal/Modal';
import styles from './AllRoomsPanel.module.scss';

interface Props {
  onSelect: (roomId: string) => void;
  onClose: () => void;
}

// Панель "Все комнаты" — админский обзор всех комнат в системе, портирован
// с оригинального #roomsPanel (там был выезжающий сайдбар, здесь — модалка,
// как и остальные детальные виды в этом переносе).
export function AllRoomsPanel({ onSelect, onClose }: Props) {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<Array<{ roomId: string; webhooksCount: number }> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .allRooms()
      .then((result) => {
        if (!cancelled) setRooms(result.rooms);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal title={t.room.allRooms.title} icon={<Stack size={18} />} onClose={onClose}>
      {error && <p className={styles.state}>{t.room.allRooms.empty}</p>}
      {!error && rooms === null && <p className={styles.state}>{t.common.loading}</p>}
      {!error && rooms !== null && rooms.length === 0 && <p className={styles.state}>{t.room.allRooms.empty}</p>}

      {!error && rooms !== null && rooms.length > 0 && (
        <ul className={styles.list}>
          {rooms.map((room) => (
            <li key={room.roomId} className={styles.row}>
              <div className={styles.info}>
                <span className={styles.roomId}>{room.roomId}</span>
                <span className={styles.count}>
                  <Database size={12} />
                  {t.room.allRooms.webhooksCount(room.webhooksCount)}
                </span>
              </div>
              <button
                type="button"
                className={styles.openBtn}
                onClick={() => {
                  onSelect(room.roomId);
                  onClose();
                }}
              >
                <SignIn size={14} /> {t.room.allRooms.open}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
