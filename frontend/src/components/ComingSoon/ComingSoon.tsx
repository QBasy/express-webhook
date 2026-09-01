import { Wrench } from '@phosphor-icons/react';
import { useI18n } from '../../i18n/I18nContext';
import styles from './ComingSoon.module.scss';

// Заглушка для страниц, ещё не перенесённых на React (см. RFC, задача 7).
export function ComingSoon({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <div className={styles.wrap}>
      <Wrench size={40} />
      <h2>{title}</h2>
      <p>{t.comingSoon.description}</p>
    </div>
  );
}
