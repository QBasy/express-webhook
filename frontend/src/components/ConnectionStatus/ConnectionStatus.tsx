import { useI18n } from '../../i18n/I18nContext';
import styles from './ConnectionStatus.module.scss';

interface Props {
  isOnline: boolean;
  reconnectAttempts: number;
}

// Индикатор состояния соединения — как оригинальный #connectionStatus в
// main-script.js: зелёная точка + "Подключено" в норме, красная тряска при
// обрыве, жёлтая пульсация с номером попытки во время переподключения.
export function ConnectionStatus({ isOnline, reconnectAttempts }: Props) {
  const { t } = useI18n();

  if (isOnline) {
    return (
      <div className={`${styles.status} ${styles.online}`}>
        <span className={`${styles.dot} ${styles.dotGreen}`} />
        <span>{t.room.connection.online}</span>
      </div>
    );
  }

  if (reconnectAttempts > 0) {
    return (
      <div className={`${styles.status} ${styles.reconnecting}`}>
        <span className={`${styles.dot} ${styles.dotYellow}`} />
        <span>{t.room.connection.reconnecting(reconnectAttempts)}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.status} ${styles.offline}`}>
      <span className={`${styles.dot} ${styles.dotRed}`} />
      <span>{t.room.connection.offline}</span>
    </div>
  );
}
