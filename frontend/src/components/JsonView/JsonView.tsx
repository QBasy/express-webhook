import { useMemo, type MouseEvent } from 'react';
import { Check, Copy } from '@phosphor-icons/react';
import { useClipboard } from '../../hooks/useClipboard';
import { useI18n } from '../../i18n/I18nContext';
import { CopyToast } from '../CopyToast/CopyToast';
import styles from './JsonView.module.scss';

type TokenKind = 'key' | 'string' | 'number' | 'boolean' | 'null';

interface JsonToken {
  text: string;
  kind: TokenKind;
  copyValue?: string;
}

type JsonPart = string | JsonToken;

// Разбираем JSON.stringify(..., null, 2) на токены — так же, как это делал
// оригинальный syntaxHighlight в main-script.js, только без dangerouslySetInnerHTML.
const TOKEN_RE = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

function tokenize(text: string): JsonPart[] {
  const parts: JsonPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE);

  while ((match = re.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(classify(match[0]));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function classify(raw: string): JsonToken {
  if (raw.startsWith('"')) {
    const isKey = /:\s*$/.test(raw);
    const closingQuoteIndex = raw.lastIndexOf('"');
    if (isKey) {
      return { text: raw, kind: 'key', copyValue: raw.slice(1, closingQuoteIndex) };
    }
    return { text: raw, kind: 'string', copyValue: raw.slice(1, -1) };
  }
  if (raw === 'true' || raw === 'false') return { text: raw, kind: 'boolean' };
  if (raw === 'null') return { text: raw, kind: 'null' };
  return { text: raw, kind: 'number' };
}

export function JsonView({ value }: { value: unknown }) {
  const { t } = useI18n();
  const text = useMemo(() => safeStringify(value), [value]);
  const parts = useMemo(() => tokenize(text), [text]);
  const { copied, copy, toast } = useClipboard();

  function handleCopyAll(event: MouseEvent) {
    copy(text, event);
  }

  function handleTokenClick(token: JsonToken, event: MouseEvent) {
    if (token.copyValue === undefined) return;
    event.stopPropagation();
    copy(token.copyValue, event);
  }

  return (
    <div className={styles.wrap}>
      <CopyToast toast={toast} />
      <button type="button" className={styles.copyBtn} onClick={handleCopyAll} title={t.common.copy}>
        {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
      </button>
      <pre className={styles.pre}>
        {parts.map((part, index) => {
          if (typeof part === 'string') {
            return part;
          }
          const clickable = part.kind === 'key' || part.kind === 'string';
          return (
            <span
              key={index}
              className={`${styles.token} ${styles[part.kind]} ${clickable ? styles.clickable : ''}`}
              onClick={clickable ? (event) => handleTokenClick(part, event) : undefined}
              title={clickable ? (part.kind === 'key' ? t.common.copyKey : t.common.copyValue) : undefined}
            >
              {part.text}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
