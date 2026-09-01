import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import type { ToastItem, ToastType } from '../../toast/ToastContext';
import styles from './Toast.module.scss';

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: WarningCircle,
};

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport}>
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <button
            key={toast.id}
            type="button"
            className={`${styles.toast} ${styles[toast.type]} ${toast.leaving ? styles.leaving : ''}`}
            onClick={() => onDismiss(toast.id)}
          >
            <Icon size={18} weight="bold" />
            <span>{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}
