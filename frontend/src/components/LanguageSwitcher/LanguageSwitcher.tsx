import { useI18n } from '../../i18n/I18nContext';
import type { Lang } from '../../i18n/translations';
import styles from './LanguageSwitcher.module.scss';

const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={`${styles.switcher} ${compact ? styles.compact : ''}`} role="group" aria-label="Language">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={code === lang ? styles.active : undefined}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
