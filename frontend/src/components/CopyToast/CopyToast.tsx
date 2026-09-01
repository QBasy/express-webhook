import type { CopyToast as CopyToastState } from '../../hooks/useClipboard';
import { useI18n } from '../../i18n/I18nContext';
import styles from './CopyToast.module.scss';

export function CopyToast({ toast }: { toast: CopyToastState | null }) {
  const { t } = useI18n();

  if (!toast) return null;

  return (
    <div className={styles.toast} style={{ left: toast.x, top: toast.y }}>
      {t.common.copied}
    </div>
  );
}
