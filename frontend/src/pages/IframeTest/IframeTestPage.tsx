import { useEffect, useState } from 'react';
import styles from './IframeTestPage.module.scss';

// Внутренний dev-инструмент: превью /webhooks/:roomId в iframe на разных
// масштабах, чтобы проверить адаптивность до того, как ссылку отдают
// партнёру. Не часть партнёрского флоу, никуда не линкуется из основного
// приложения — просто отдельный роут для ручного тестирования.
const STORAGE_KEY = 'iframe_test_room_id';

// Живым (с реальным SSE-соединением) держим только один превью за раз —
// остальные грузят статический снимок через /page без стрима. У браузера
// лимит на конкурентные соединения к одному origin (6 на HTTP/1.1), и N
// одновременно открытых EventSource съедают их все, вешая даже обычные
// fetch-запросы (в т.ч. пагинацию) к тому же localhost:8080. См. ?live=0/1 в
// PublicWebhooksPage/useWebhookFeed.
const SIZES = [
  { id: 'sm', label: '280 × 480', width: 280, height: 480 },
  { id: 'iphone', label: '375 × 600 (iPhone)', width: 375, height: 600 },
  { id: 'md', label: '480 × 640', width: 480, height: 640 },
  { id: 'tablet', label: '768 × 640 (планшет)', width: 768, height: 640 },
  { id: 'desktop', label: '1024 × 640 (десктоп)', width: 1024, height: 640 },
] as const;

const FULL_WIDTH_ID = 'full';

export function IframeTestPage() {
  const [roomId, setRoomId] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [appliedRoomId, setAppliedRoomId] = useState(roomId);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (appliedRoomId) localStorage.setItem(STORAGE_KEY, appliedRoomId);
  }, [appliedRoomId]);

  function apply() {
    setAppliedRoomId(roomId.trim());
    setActiveId(null);
  }

  function buildSrc(previewId: string): string | null {
    if (!appliedRoomId) return null;
    const live = previewId === activeId ? '1' : '0';
    return `/webhooks/${encodeURIComponent(appliedRoomId)}?live=${live}`;
  }

  const hasRoom = Boolean(appliedRoomId);

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

      {!hasRoom ? (
        <p className={styles.empty}>Введите Room ID выше, чтобы загрузить превью</p>
      ) : (
        <>
          <p className={styles.hint}>
            Живой (SSE) держим только у одного превью за раз — кликните по превью или кнопке «Сделать живым»,
            чтобы переключить. Остальные показывают статический снимок без стрима.
          </p>

          <div className={styles.grid}>
            {SIZES.map((size) => (
              <div key={size.id} className={styles.cell}>
                <div className={styles.cellLabel}>
                  <b>{size.label}</b>
                  {activeId === size.id && <span className={styles.liveDot} title="Живой (SSE)" />}
                  <button type="button" className={styles.liveBtn} onClick={() => setActiveId(size.id)}>
                    {activeId === size.id ? 'Живой' : 'Сделать живым'}
                  </button>
                </div>
                <div
                  className={`${styles.frame} ${styles.resizable}`}
                  style={{ width: size.width, height: size.height }}
                >
                  <iframe src={buildSrc(size.id) ?? undefined} title={`preview ${size.label}`} />
                </div>
              </div>
            ))}

            <div className={`${styles.cell} ${styles.full}`}>
              <div className={styles.cellLabel}>
                <b>100% ширины (тянется вслед за окном)</b>
                {activeId === FULL_WIDTH_ID && <span className={styles.liveDot} title="Живой (SSE)" />}
                <button type="button" className={styles.liveBtn} onClick={() => setActiveId(FULL_WIDTH_ID)}>
                  {activeId === FULL_WIDTH_ID ? 'Живой' : 'Сделать живым'}
                </button>
              </div>
              <div className={styles.frame} style={{ height: 640 }}>
                <iframe src={buildSrc(FULL_WIDTH_ID) ?? undefined} title="preview full width" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
