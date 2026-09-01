import styles from './StatTile.module.scss';

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.tile}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
