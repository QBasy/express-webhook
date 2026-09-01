import type { ReactNode } from 'react';
import styles from './Badge.module.scss';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
