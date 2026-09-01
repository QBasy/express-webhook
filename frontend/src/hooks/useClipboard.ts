import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';

export interface CopyToast {
  x: number;
  y: number;
}

export function useClipboard(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<CopyToast | null>(null);

  const copy = useCallback(
    async (text: string, event?: ReactMouseEvent) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Буфер обмена недоступен (например, не-HTTPS в старом браузере) —
        // тихо игнорируем, поле остаётся выделяемым вручную.
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelayMs);

      if (event) {
        setToast({ x: event.clientX, y: event.clientY });
        setTimeout(() => setToast(null), 900);
      }
    },
    [resetDelayMs]
  );

  return { copied, copy, toast };
}
