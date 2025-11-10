<script lang="ts">
    import { Copy, Trash2, Info } from 'lucide-svelte';
    import JsonHighlight from './JsonHighlight.svelte';
    import type { Webhook } from '$lib/types';

    let {
        webhook,
        onDelete,
        onDetails
    }: {
        webhook: any;
        onDelete?: () => void;
        onDetails?: () => void;
    } = $props();

    function formatTimestamp(ts: string) {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return "Только что";
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;

        return date.toLocaleString("ru-RU", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async function copyPayload() {
        try {
            await navigator.clipboard.writeText(JSON.stringify(webhook.body, null, 2));
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    function getMethodBadgeClass(method: string) {
        const methodUpper = method?.toUpperCase() || 'POST';
        const classes: Record<string, string> = {
            'GET': 'bg-blue-100 text-blue-800',
            'POST': 'bg-green-100 text-green-800',
            'PUT': 'bg-yellow-100 text-yellow-800',
            'PATCH': 'bg-purple-100 text-purple-800',
            'DELETE': 'bg-red-100 text-red-800'
        };
        return classes[methodUpper] || 'bg-gray-100 text-gray-800';
    }
</script>

<div class="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-lg hover:border-green-300 transition-all">
    <div class="flex justify-between items-start mb-3">
        <div class="flex items-center gap-3 flex-wrap">
            {#if onDetails}
                <button
                        onclick={onDetails}
                        class="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded hover:bg-green-200 transition cursor-pointer"
                        title="Открыть детали"
                >
                    ID: {webhook.receiptId}
                </button>
            {:else}
                <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                    ID: {webhook.receiptId}
                </span>
            {/if}

            <span class="inline-block px-3 py-1 rounded-lg font-semibold text-xs uppercase {getMethodBadgeClass(webhook.metadata?.method)}">
                {webhook.metadata?.method || 'POST'}
            </span>

            <span class="text-sm text-gray-500">{formatTimestamp(webhook.timestamp)}</span>
        </div>

        <div class="flex gap-2">
            <button
                    onclick={copyPayload}
                    class="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition text-sm font-medium flex items-center gap-1"
                    title="Копировать весь объект"
            >
                <Copy size={16} />
                <span>Копировать</span>
            </button>
            {#if onDelete}
                <button
                        onclick={onDelete}
                        class="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm font-medium flex items-center gap-1"
                        title="Удалить"
                >
                    <Trash2 size={16} />
                    <span>Удалить</span>
                </button>
            {/if}
        </div>
    </div>

    <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200 hover:bg-white transition">
        <JsonHighlight data={webhook.body} />
    </div>

    <div class="mt-2 text-xs text-gray-500 italic flex items-center gap-1">
        <Info size={12} />
        <span>Нажмите на ID для детальной информации или на ключ/значение для копирования</span>
    </div>
</div>
