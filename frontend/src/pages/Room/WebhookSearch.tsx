import { useState, type FormEvent } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { webhooksApi, type SearchResult } from '../../api/webhooks';
import { useI18n } from '../../i18n/I18nContext';
import { JsonView } from '../../components/JsonView/JsonView';
import styles from './WebhookSearch.module.scss';

type Mode = 'substring' | 'exact';

export function WebhookSearch({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('substring');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    try {
      const searchResult = await webhooksApi.search(roomId, mode, trimmed);
      setResult(searchResult);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.modeToggle} role="tablist">
          <button
            type="button"
            className={mode === 'substring' ? styles.modeActive : styles.mode}
            onClick={() => setMode('substring')}
          >
            {t.room.search.modeSubstring}
          </button>
          <button
            type="button"
            className={mode === 'exact' ? styles.modeActive : styles.mode}
            onClick={() => setMode('exact')}
          >
            {t.room.search.modeExact}
          </button>
        </div>
        <div className={styles.inputRow}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.room.search.placeholder}
          />
          <button type="submit" disabled={isSearching || !query.trim()}>
            <MagnifyingGlass size={16} weight="bold" />
            {t.room.search.button}
          </button>
        </div>
      </form>

      {result && (
        <div className={styles.results}>
          <p className={styles.count}>{t.room.search.resultsCount(result.total)}</p>
          {result.matches.length === 0 ? (
            <p className={styles.empty}>{t.room.search.empty}</p>
          ) : (
            <ul className={styles.list}>
              {result.matches.map((match) => (
                <li key={match.receiptId}>
                  <JsonView value={match.body} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
