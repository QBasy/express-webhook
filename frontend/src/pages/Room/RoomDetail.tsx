import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowsClockwise, Broom, PaperPlaneTilt, Trash } from '@phosphor-icons/react';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { roomsApi } from '../../api/rooms';
import { webhooksApi } from '../../api/webhooks';
import { ApiError } from '../../api/client';
import type { Room } from '../../api/types';
import { useToast } from '../../toast/ToastContext';
import { CopyField } from '../../components/CopyField/CopyField';
import { StatTile } from '../../components/StatTile/StatTile';
import { Tabs, type TabItem } from '../../components/Tabs/Tabs';
import { FakeErrorPanel } from './FakeErrorPanel';
import { ForwardPanel } from './ForwardPanel';
import { WebhookList } from './WebhookList';
import { WebhookSearch } from './WebhookSearch';
import { DuplicatesPanel } from './DuplicatesPanel';
import styles from './RoomDetail.module.scss';

interface Props {
  room: Room;
  onBack: () => void;
  onClosed: (roomId: string) => void;
}

export function RoomDetail({ room, onBack, onClosed }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [reloadKey, setReloadKey] = useState(0);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [stats, setStats] = useState<{ total: number; duplicates: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    Promise.all([
      webhooksApi.list(room.roomId),
      // Дубли — админский инструмент, обычным пользователям его не считаем.
      isAdmin ? webhooksApi.duplicatesSummary(room.roomId, 1, 1) : Promise.resolve(null),
    ]).then(([hooks, duplicates]) => {
      if (!cancelled) setStats({ total: hooks.length, duplicates: duplicates?.totalGroups ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [room.roomId, reloadKey, isAdmin]);

  function handleRefresh() {
    setReloadKey((key) => key + 1);
  }

  async function handleClear() {
    if (!window.confirm(t.room.header.clearConfirm)) return;
    await webhooksApi.clear(room.roomId);
    handleRefresh();
  }

  async function handleClose() {
    if (!window.confirm(t.room.header.closeConfirm)) return;
    await roomsApi.close(room.roomId);
    onClosed(room.roomId);
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    try {
      await webhooksApi.sendTest(room.roomId);
      showToast(t.room.testSent, 'success');
      handleRefresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t.room.testSent, 'error');
    } finally {
      setIsSendingTest(false);
    }
  }

  const webhookUrl = `${window.location.origin}/hook/${room.roomId}`;

  const tabs: TabItem[] = [
    { key: 'list', label: t.room.tabs.list, content: <WebhookList roomId={room.roomId} reloadKey={reloadKey} /> },
    { key: 'search', label: t.room.tabs.search, content: <WebhookSearch roomId={room.roomId} /> },
    // Поиск дублей — диагностический инструмент, доступен только админам.
    ...(isAdmin
      ? [{ key: 'duplicates', label: t.room.tabs.duplicates, content: <DuplicatesPanel roomId={room.roomId} /> }]
      : []),
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={16} /> {t.common.back}
        </button>
        <div className={styles.actions}>
          <button type="button" className={styles.actionBtn} onClick={handleSendTest} disabled={isSendingTest}>
            <PaperPlaneTilt size={16} /> {t.room.sendTest}
          </button>
          <button type="button" className={styles.actionBtn} onClick={handleRefresh}>
            <ArrowsClockwise size={16} /> {t.room.header.refresh}
          </button>
          <button type="button" className={styles.actionBtn} onClick={handleClear}>
            <Broom size={16} /> {t.room.header.clear}
          </button>
          <button type="button" className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={handleClose}>
            <Trash size={16} /> {t.room.header.closeRoom}
          </button>
        </div>
      </div>

      <div className={styles.infoCard}>
        <CopyField label={t.room.fields.webhookUrl} value={webhookUrl} />
        <CopyField label={t.room.fields.roomId} value={room.roomId} />
      </div>

      <div className={styles.stats}>
        <StatTile label={t.room.stats.total} value={stats?.total ?? '—'} />
        <StatTile label={t.room.stats.ttl} value={`${room.webhookTTL} ${t.room.fields.ttlUnit}`} />
        {isAdmin && <StatTile label={t.room.stats.duplicates} value={stats?.duplicates ?? '—'} />}
      </div>

      {isAdmin && <FakeErrorPanel roomId={room.roomId} />}
      <ForwardPanel roomId={room.roomId} />

      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
