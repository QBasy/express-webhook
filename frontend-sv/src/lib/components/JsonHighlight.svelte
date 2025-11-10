<script lang="ts">
    import { showAlert } from '$lib/stores';
    import { browser } from '$app/environment';

    let { data }: { data: any } = $props();

    let hoveredElement: HTMLElement | null = $state(null);

    function escapeHtml(text: string): string {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function copyWithFeedback(text: string, event: MouseEvent) {
        if (!browser) return;

        navigator.clipboard.writeText(text).then(() => {
            const indicator = document.createElement('div');
            indicator.className = 'copy-indicator';
            indicator.textContent = '✓ Скопировано';
            indicator.style.left = event.pageX + 'px';
            indicator.style.top = event.pageY + 'px';
            document.body.appendChild(indicator);

            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 300);
            }, 1000);
        });
    }

    function extractObjectFromPosition(jsonStr: string, position: number): string | null {
        let braceCount = 0;
        let bracketCount = 0;
        let start = position;
        let inString = false;
        let escape = false;

        while (start >= 0) {
            const char = jsonStr[start];

            if (!inString) {
                if (char === '{' || char === '[') {
                    break;
                }
            }

            if (char === '"' && !escape) {
                inString = !inString;
            }
            escape = char === '\\' && !escape;
            start--;
        }

        if (start < 0) return null;

        const startChar = jsonStr[start];
        const isObject = startChar === '{';
        const isBracket = startChar === '[';

        if (!isObject && !isBracket) return null;

        let end = start;
        inString = false;
        escape = false;
        braceCount = 0;
        bracketCount = 0;

        while (end < jsonStr.length) {
            const char = jsonStr[end];

            if (char === '"' && !escape) {
                inString = !inString;
            }

            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;

                if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
                    end++;
                    break;
                }
            }

            escape = char === '\\' && !escape;
            end++;
        }

        const extracted = jsonStr.substring(start, end);

        try {
            JSON.parse(extracted);
            return extracted;
        } catch {
            return null;
        }
    }

    function handleJsonClick(event: MouseEvent) {
        const target = event.target as HTMLElement;

        if (target.classList.contains('json-key') ||
            target.classList.contains('json-string') ||
            target.classList.contains('json-number') ||
            target.classList.contains('json-boolean')) {

            const text = target.textContent || '';
            let valueToCopy = text;

            if (target.classList.contains('json-key')) {
                valueToCopy = text.replace(/^"|":$/g, '').replace(/":$/, '');
            } else if (target.classList.contains('json-string')) {
                valueToCopy = text.replace(/^"|"$/g, '');
            }

            const decoded = valueToCopy
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#039;/g, "'");

            copyWithFeedback(decoded, event);
            return;
        }

        if (target.classList.contains('json-object-brace') ||
            target.classList.contains('json-array-bracket')) {

            const pre = target.closest('pre');
            if (!pre) return;

            const fullText = pre.textContent || '';
            const range = document.createRange();
            const selection = window.getSelection();

            if (!selection) return;

            range.selectNodeContents(target);
            selection.removeAllRanges();
            selection.addRange(range);

            const offset = getTextOffset(pre, target);
            const extracted = extractObjectFromPosition(fullText, offset);

            if (extracted) {
                try {
                    const parsed = JSON.parse(extracted);
                    const formatted = JSON.stringify(parsed, null, 2);
                    copyWithFeedback(formatted, event);
                } catch {
                    copyWithFeedback(extracted, event);
                }
            }

            selection.removeAllRanges();
        }
    }

    function getTextOffset(container: Node, target: Node): number {
        let offset = 0;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
        );

        let currentNode;
        while ((currentNode = walker.nextNode())) {
            if (currentNode.parentElement === target || currentNode.parentElement?.closest('[class*="json-"]') === target) {
                break;
            }
            offset += currentNode.textContent?.length || 0;
        }

        return offset;
    }

    function syntaxHighlight(json: any): string {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }

        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        let html = '';
        let inString = false;
        let currentToken = '';
        let i = 0;

        const flush = (type: string) => {
            if (currentToken) {
                if (type === 'key') {
                    html += `<span class="json-key" title="Копировать ключ">${currentToken}</span>`;
                } else if (type === 'string') {
                    html += `<span class="json-string" title="Копировать значение">${currentToken}</span>`;
                } else if (type === 'number') {
                    html += `<span class="json-number" title="Копировать значение">${currentToken}</span>`;
                } else if (type === 'boolean') {
                    html += `<span class="json-boolean" title="Копировать значение">${currentToken}</span>`;
                } else if (type === 'null') {
                    html += `<span class="json-null">${currentToken}</span>`;
                }
                currentToken = '';
            }
        };

        while (i < json.length) {
            const char = json[i];
            const nextChar = json[i + 1];

            if (char === '"' && (i === 0 || json[i - 1] !== '\\')) {
                if (!inString) {
                    inString = true;
                    currentToken = '"';
                } else {
                    currentToken += '"';
                    const isKey = nextChar === ':';
                    flush(isKey ? 'key' : 'string');
                    inString = false;
                }
            } else if (inString) {
                currentToken += char;
            } else if (char === '{') {
                html += '<span class="json-object-brace" title="Копировать объект">{</span>';
            } else if (char === '}') {
                flush('');
                html += '<span class="json-object-brace" title="Копировать объект">}</span>';
            } else if (char === '[') {
                html += '<span class="json-array-bracket" title="Копировать массив">[</span>';
            } else if (char === ']') {
                flush('');
                html += '<span class="json-array-bracket" title="Копировать массив">]</span>';
            } else if (char === ':') {
                html += '<span class="json-colon">:</span>';
            } else if (char === ',') {
                flush('');
                html += '<span class="json-comma">,</span>';
            } else if (/\d/.test(char) || (char === '-' && /\d/.test(nextChar))) {
                currentToken += char;
                let j = i + 1;
                while (j < json.length && /[\d.eE+\-]/.test(json[j])) {
                    currentToken += json[j];
                    j++;
                }
                flush('number');
                i = j - 1;
            } else if (json.substr(i, 4) === 'true') {
                currentToken = 'true';
                flush('boolean');
                i += 3;
            } else if (json.substr(i, 5) === 'false') {
                currentToken = 'false';
                flush('boolean');
                i += 4;
            } else if (json.substr(i, 4) === 'null') {
                currentToken = 'null';
                flush('null');
                i += 3;
            } else if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
                html += char;
            }

            i++;
        }

        return html;
    }
</script>

<pre
        class="text-sm font-mono select-text"
        onclick={handleJsonClick}
>{@html syntaxHighlight(data)}</pre>

<style>
    :global(.copy-indicator) {
        position: fixed;
        background: #10b981;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        animation: copyPop 0.5s ease-out;
    }

    @keyframes copyPop {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }

    pre {
        cursor: default;
    }

    :global(.json-key) {
        color: #0066cc;
        cursor: pointer;
        transition: all 0.15s;
        font-weight: 600;
    }

    :global(.json-key:hover) {
        background: #e3f2fd !important;
        padding: 2px 4px;
        border-radius: 3px;
        text-decoration: underline;
    }

    :global(.json-string) {
        color: #22863a;
        cursor: pointer;
        transition: all 0.15s;
    }

    :global(.json-string:hover) {
        background: #f0fff4;
        padding: 2px 4px;
        border-radius: 3px;
        text-decoration: underline;
    }

    :global(.json-number) {
        color: #005cc5;
        cursor: pointer;
        transition: all 0.15s;
    }

    :global(.json-number:hover) {
        background: #e3f2fd;
        padding: 2px 4px;
        border-radius: 3px;
    }

    :global(.json-boolean) {
        color: #d73a49;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.15s;
    }

    :global(.json-boolean:hover) {
        background: #ffebee;
        padding: 2px 4px;
        border-radius: 3px;
    }

    :global(.json-null) {
        color: #6f42c1;
        font-weight: bold;
    }

    :global(.json-object-brace),
    :global(.json-array-bracket) {
        color: #333;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        padding: 2px;
    }

    :global(.json-object-brace:hover),
    :global(.json-array-bracket:hover) {
        background: #ffc107;
        border-radius: 4px;
        transform: scale(1.2);
    }

    :global(.json-colon) {
        color: #666;
        margin: 0 4px;
    }

    :global(.json-comma) {
        color: #666;
    }
</style>