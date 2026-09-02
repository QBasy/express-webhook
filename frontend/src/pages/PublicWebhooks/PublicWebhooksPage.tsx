import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowSquareOut, Prohibit } from '@phosphor-icons/react';
import { webhooksApi } from '../../api/webhooks';
import { ApiError } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import { Tabs, type TabItem } from '../../components/Tabs/Tabs';
import { WebhookList } from '../Room/WebhookList';
import { WebhookSearch } from '../Room/WebhookSearch';
import styles from './PublicWebhooksPage.module.scss';

// Публичная, неавторизованная страница вебхуков комнаты — тот же список и
// поиск, что и в личном кабинете (WebhookList/WebhookSearch), только без
// авторизации и без деструктивных действий (readOnly: без удаления, без
// пересылки/fake-error/закрытия комнаты). Предназначена для встраивания
// партнёром в iframe на своём сайте: https://{apiUrl}/webhooks/:roomId.
//
// Доступ по знанию ID комнаты — та же модель, что и у самого приёма
// вебхуков (/hook/:id): GET /hook/all/:id и без этой страницы уже был
// публичным, новых прав тут не появляется.
export function PublicWebhooksPage() {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('list');
  const [notFound, setNotFound] = useState(false);

  // Разовая проверка при заходе — решает, показывать ли вкладки вообще, или
  // сразу отдать понятный экран "не найдено". WebhookList дальше сам
  // переживёт 404 у себя (см. useWebhookFeed: серверная пагинация + SSE), это
  // не дублирование защиты, а просто более быстрый и явный первый экран.
  useEffect(() => {
    let cancelled = false;
    setNotFound(false);
    webhooksApi.list(roomId).catch((err) => {
      if (!cancelled && err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <Prohibit size={28} />
          <p className={styles.notFoundTitle}>{t.publicWebhooks.notFoundTitle}</p>
          <p className={styles.notFoundSubtitle}>{t.publicWebhooks.notFoundSubtitle}</p>
        </div>
      </div>
    );
  }

  const tabs: TabItem[] = [
    { key: 'list', label: t.room.tabs.list, content: <WebhookList roomId={roomId} reloadKey={0} readOnly /> },
    { key: 'search', label: t.room.tabs.search, content: <WebhookSearch roomId={roomId} /> },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.title}>{t.publicWebhooks.title}</span>
          <span className={styles.roomId}>
            {t.publicWebhooks.roomLabel}: {roomId}
          </span>
        </div>
        <a className={styles.expandLink} href={window.location.href} target="_top" rel="noreferrer">
          <ArrowSquareOut size={14} />
          {t.publicWebhooks.openOnSite}
        </a>
      </header>

      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} />

      <footer className={styles.footer}>
        <span>{t.publicWebhooks.poweredBy}</span>
        <a href="/login">{t.publicWebhooks.loginLink} →</a>
      </footer>
    </div>
  );
}
