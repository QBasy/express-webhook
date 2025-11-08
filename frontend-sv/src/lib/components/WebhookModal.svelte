<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { X, Copy, Info, List, Search, FileText } from 'lucide-svelte';
    import { fade } from 'svelte/transition';

    export let webhook: any;

    const dispatch = createEventDispatcher();

    function formatTimestamp(timestamp: string) {
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function getMethodBadgeClass(method: string) {
        const methodUpper = method?.toUpperCase() || 'POST';
        const classes: Record<string, string> = {
            'GET': 'bg-blue-100 text-blue-800',
            'POST': 'bg-green-100 text-green-800',
            'PUT': 'bg-yellow-100 text-yellow-800',
            'PATCH': 'bg-purple-100 text-purple-800',
            'DELETE': 'bg-red-100 text-red-800',
            'OPTIONS': 'bg-indigo-100 text-indigo-800',
            'HEAD': 'bg-gray-100 text-gray-800'
        };
        return classes[methodUpper] || 'bg-gray-100 text-gray-700';
    }

    function escapeHtml(unsafe: string) {
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function syntaxHighlight(obj: any): string {
        let json = JSON.stringify(obj, null, 2);

        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });

        return json;
    }

    function copyToClipboard() {
        const text = JSON.stringify(webhook, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            alert('Полная информация скопирована');
        });
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            dispatch('close');
        }
    }

    $: metadata = webhook.metadata || {};
    $: headers = metadata.headers || {};
    $: query = metadata.query || {};
    $: body = webhook.body || {};
</script>

<div
        on:click={handleBackdropClick}
        transition:fade={{ duration: 200 }}
        class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center px-4"
>
    <div
            on:click={(e) => e.stopPropagation()}
            class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
    >
        <!-- Header -->
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start z-10">
            <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Info size={24} class="text-blue-600" />
                <span>Подробности</span>
            </h3>
            <button
                    on:click={() => dispatch('close')}
                    class="text-gray-400 hover:text-gray-600 transition"
            >
                <X size={24} />
            </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-4 space-y-6">
            <!-- Summary -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs text-gray-600 mb-1">Method</p>
                        <span class="inline-block px-3 py-1 rounded-md text-xs font-semibold uppercase {getMethodBadgeClass(metadata.method || 'POST')}">
							{metadata.method || 'POST'}
						</span>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600 mb-1">ID</p>
                        <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800">{webhook.receiptId}</code>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600 mb-1">Host / IP</p>
                        <div class="flex items-center gap-2">
                            <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800">{metadata.ip || 'unknown'}</code>
                            {#if metadata.ip && metadata.ip !== 'unknown'}
                                <a
                                        href="https://www.whois.com/whois/{metadata.ip}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-blue-600 hover:text-blue-800 text-xs underline"
                                >
                                    whois
                                </a>
                            {/if}
                        </div>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600 mb-1">Date</p>
                        <p class="text-sm text-gray-800">{formatTimestamp(webhook.timestamp)}</p>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="text-xs text-gray-600 mb-1">URL</p>
                    <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800 break-all block">{metadata.url || 'N/A'}</code>
                </div>
            </div>

            <!-- Headers -->
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <List size={20} class="text-gray-600" />
                    Headers
                </h4>
                <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                    {#if Object.keys(headers).length > 0}
                        {#each Object.entries(headers) as [key, value]}
                            <div class="flex items-start gap-2 py-1">
                                <code class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">{escapeHtml(key)}</code>
                                <code class="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded font-mono flex-1 break-all">
                                    {escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}
                                </code>
                            </div>
                        {/each}
                    {:else}
                        <p class="text-gray-400 text-sm italic">(empty)</p>
                    {/if}
                </div>
            </div>

            <!-- Query Strings -->
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Search size={20} class="text-gray-600" />
                    Query Strings
                </h4>
                <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {#if Object.keys(query).length > 0}
                        {#each Object.entries(query) as [key, value]}
                            <div class="flex items-start gap-2 py-1">
                                <code class="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-mono">{escapeHtml(key)}</code>
                                <code class="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded font-mono flex-1 break-all">
                                    {escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}
                                </code>
                            </div>
                        {/each}
                    {:else}
                        <p class="text-gray-400 text-sm italic">(empty)</p>
                    {/if}
                </div>
            </div>

            <!-- Body -->
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText size={20} class="text-gray-600" />
                    Body
                </h4>
                {#if body && Object.keys(body).length > 0}
                    <pre class="text-sm font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200">{@html syntaxHighlight(body)}</pre>
                {:else}
                    <p class="text-gray-400 text-sm italic">(no body content)</p>
                {/if}
            </div>
        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <button
                    on:click={copyToClipboard}
                    class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
                <Copy size={20} />
                <span>Копировать всё</span>
            </button>
        </div>
    </div>
</div>

<style>
    :global(.json-key) {
        color: #0066cc;
    }
    :global(.json-string) {
        color: #22863a;
    }
    :global(.json-number) {
        color: #005cc5;
    }
    :global(.json-boolean) {
        color: #d73a49;
    }
    :global(.json-null) {
        color: #6f42c1;
    }
</style>