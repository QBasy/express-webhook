import { Check, Copy } from '@phosphor-icons/react';
import { useClipboard } from '../../hooks/useClipboard';
import styles from './CopyField.module.scss';

export function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const { copied, copy } = useClipboard();

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${mono ? styles.mono : ''}`}>{value}</span>
      <button type="button" className={styles.copyBtn} onClick={() => copy(value)} aria-label={label}>
        {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
      </button>
    </div>
  );
}
