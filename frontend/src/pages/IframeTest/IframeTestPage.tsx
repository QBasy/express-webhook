import { useEffect, useState } from 'react';
import styles from './IframeTestPage.module.scss';

// Внутренний dev-инструмент: превью /webhooks/:roomId в iframe на разных
// масштабах, чтобы проверить адаптивность до того, как ссылку отдают
// партнёру. Не часть партнёрского флоу, никуда не линкуется из основного
// приложения — просто отдельный роут для ручного тестирования.
const STORAGE_KEY = 'iframe_test_room_id';

const SIZES = [
  { label: '280 × 480', width: 280, height: 480 },
  { label: '375 × 600 (iPhone)', width: 375, height: 600 },
  { label: '480 × 640', width: 480, height: 640 },
  { label: '768 × 640 (планшет)', width: 768, height: 640 },
  { label: '1024 × 640 (десктоп)', width: 1024, height: 640 },
] as const;

export function IframeTestPage() {
  const [roomId, setRoomId] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [appliedRoomId, setAppliedRoomId] = useState(roomId);

  useEffect(() => {
    if (appliedRoomId) localStorage.setItem(STORAGE_KEY, appliedRoomId);
  }, [appliedRoomId]);

  function apply() {
    setAppliedRoomId(roomId.trim());
  }

  const src = appliedRoomId ? `/webhooks/${encodeURIComponent(appliedRoomId)}` : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Тест iframe-встраивания /webhooks/:roomId</h1>
      <p className={styles.sub}>Только для внутренних тестов адаптивности публичной страницы. Не для партнёров.</p>

      <div className={styles.controls}>
        <label htmlFor="iframe-test-room-id">Room ID:</label>
        <input
          id="iframe-test-room-id"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="например 9903001001"
          autoComplete="off"
        />
        <button type="button" onClick={apply}>
          Обновить все
        </button>
      </div>

      {!src ? (
        <p className={styles.empty}>Введите Room ID выше, чтобы загрузить превью</p>
      ) : (
        <div className={styles.grid}>
          {SIZES.map((size) => (
            <div key={size.label} className={styles.cell}>
              <div className={styles.cellLabel}>
                <b>{size.label}</b>
              </div>
              <div
                className={`${styles.frame} ${styles.resizable}`}
                style={{ width: size.width, height: size.height }}
              >
                <iframe src={src} title={`preview ${size.label}`} />
              </div>
            </div>
          ))}

          <div className={`${styles.cell} ${styles.full}`}>
            <div className={styles.cellLabel}>
              <b>100% ширины (тянется вслед за окном)</b>
            </div>
            <div className={styles.frame} style={{ height: 640 }}>
              <iframe src={src} title="preview full width" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
