import type { ReactNode } from 'react';
import styles from './Tabs.module.scss';

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (key: string) => void }) {
  const activeItem = items.find((item) => item.key === active) ?? items[0];

  return (
    <div>
      <div className={styles.tabList} role="tablist">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === activeItem.key}
            className={item.key === activeItem.key ? styles.active : styles.tab}
            onClick={() => onChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.panel}>{activeItem.content}</div>
    </div>
  );
}
