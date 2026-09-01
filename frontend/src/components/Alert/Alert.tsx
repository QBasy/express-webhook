import { CheckCircle, Info, WarningCircle, XCircle } from '@phosphor-icons/react';
import styles from './Alert.module.scss';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

const ICONS: Record<AlertType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: WarningCircle,
  info: Info,
};

export function Alert({ type, message }: { type: AlertType; message: string }) {
  const Icon = ICONS[type];
  return (
    <div className={`${styles.alert} ${styles[type]}`} role="alert">
      <Icon size={20} weight="bold" />
      <span>{message}</span>
    </div>
  );
}
