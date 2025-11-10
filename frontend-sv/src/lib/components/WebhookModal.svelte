<script lang="ts">
    import { X, List, Search, FileText, Copy, ExternalLink } from 'lucide-svelte';
    import { showAlert } from '$lib/stores';
    import JsonHighlight from './JsonHighlight.svelte';

    let {
        webhook,
        isOpen,
        onClose
    }: {
        webhook: any | null;
        isOpen: boolean;
        onClose: () => void;
    } = $props();

    function getMethodBadgeClass(method: string) {
        const methodUpper = method?.toUpperCase() || 'POST';
        const classes: Record<string, string> = {
            'GET': 'bg-blue-100 text-blue-800',
            'POST': 'bg-green-100 text-green-800',
            'PUT': 'bg-yellow-100 text-yellow-800',
            'PATCH': 'bg-purple-100 text-purple-800',
            'DELETE': 'bg-red-100 text-red-800',
            'OPTIONS': 'bg-pink-100 text-pink-800',
            'HEAD': 'bg-gray-100 text-gray-800'
        };
        return classes[methodUpper] || 'bg-gray-100 text-gray-800';
    }

    function formatTimestamp(ts: string) {
        return new Date(ts).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function copyAll() {
        if (!webhook) return;
        const text = JSON.stringify(webhook, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            showAlert('Полная информация скопирована', 'success');
        });
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isOpen) {
            onClose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && webhook}
    <div
            class="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/50"
            onclick={handleBackdropClick}
    >
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full" onclick={(e) => e.stopPropagation()}>
                <div class="bg-white px-6 pt-5 pb-4">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <FileText size={24} class="text-blue-600" />
                            Подробности вебхука
                        </h3>
                        <button onclick={onClose} class="text-gray-400 hover:text-gray-600 transition">
                            <X size={24} />
                        </button>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-xs text-gray-600 mb-1">Метод</p>
                                    <span class="inline-block px-3 py-1 rounded-lg font-semibold text-xs uppercase {getMethodBadgeClass(webhook.metadata?.method || 'POST')}">
                                        {webhook.metadata?.method || 'POST'}
                                    </span>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-600 mb-1">ID</p>
                                    <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800">{webhook.receiptId}</code>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-600 mb-1">Host / IP</p>
                                    <div class="flex items-center gap-2">
                                        <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800">{webhook.metadata?.ip || 'unknown'}</code>
                                        {#if webhook.metadata?.ip && webhook.metadata.ip !== 'unknown'}
                                            <a href="https://www.whois.com/whois/{webhook.metadata.ip}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                                                whois <ExternalLink size={12} />
                                            </a>
                                        {/if}
                                    </div>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-600 mb-1">Дата</p>
                                    <p class="text-sm text-gray-800">{formatTimestamp(webhook.timestamp)}</p>
                                </div>
                            </div>
                            <div class="mt-3">
                                <p class="text-xs text-gray-600 mb-1">URL</p>
                                <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800 break-all block">{webhook.metadata?.url || 'N/A'}</code>
                            </div>
                        </div>

                        {#if webhook.metadata?.headers && Object.keys(webhook.metadata.headers).length > 0}
                            <div>
                                <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <List size={20} class="text-gray-600" />
                                    Headers
                                </h4>
                                <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                                    {#each Object.entries(webhook.metadata.headers) as [key, value]}
                                        <div class="flex items-start gap-2 py-1">
                                            <code class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">{key}</code>
                                            <code class="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded font-mono flex-1 break-all">
                                                {Array.isArray(value) ? value.join(', ') : value}
                                            </code>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if webhook.metadata?.query && Object.keys(webhook.metadata.query).length > 0}
                            <div>
                                <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Search size={20} class="text-gray-600" />
                                    Query Parameters
                                </h4>
                                <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    {#each Object.entries(webhook.metadata.query) as [key, value]}
                                        <div class="flex items-start gap-2 py-1">
                                            <code class="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-mono">{key}</code>
                                            <code class="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded font-mono flex-1 break-all">
                                                {Array.isArray(value) ? value.join(', ') : value}
                                            </code>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <div>
                            <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText size={20} class="text-gray-600" />
                                Body
                            </h4>
                            {#if webhook.body && Object.keys(webhook.body).length > 0}
                                <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200">
                                    <JsonHighlight data={webhook.body} />
                                </div>
                            {:else}
                                <p class="text-gray-400 text-sm italic">(no body content)</p>
                            {/if}
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                    <button
                            onclick={copyAll}
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                        <Copy size={16} />
                        <span>Скопировать всё</span>
                    </button>
                    <button
                            onclick={onClose}
                            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
