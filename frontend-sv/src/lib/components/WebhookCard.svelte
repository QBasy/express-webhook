<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Calendar, Hash, Globe } from 'lucide-svelte';

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

    function formatJson(obj: any, indent = 0): string {
        if (obj === null) return 'null';
        if (typeof obj !== 'object') return String(obj);

        const spaces = '  '.repeat(indent);
        const entries = Object.entries(obj);

        if (entries.length === 0) return '{}';

        const lines = entries.slice(0, 3).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                return `${spaces}  "${key}": {...}`;
            }
            return `${spaces}  "${key}": ${JSON.stringify(value)}`;
        });

        if (entries.length > 3) {
            lines.push(`${spaces}  ...`);
        }

        return `{\n${lines.join(',\n')}\n${spaces}}`;
    }

    $: method = webhook.metadata?.method || 'POST';
    $: ip = webhook.metadata?.ip || 'unknown';
</script>

<div
        on:click={() => dispatch('click')}
        class="border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-md transition cursor-pointer bg-white"
>
    <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
			<span class="inline-block px-3 py-1 rounded-md text-xs font-semibold uppercase {getMethodBadgeClass(method)}">
				{method}
			</span>
            <div class="flex items-center gap-1.5 text-xs text-gray-500">
                <Hash size={14} />
                <code class="font-mono">{webhook.receiptId.slice(0, 8)}...</code>
            </div>
        </div>
        <div class="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={14} />
            <span>{formatTimestamp(webhook.timestamp)}</span>
        </div>
    </div>

    {#if ip && ip !== 'unknown'}
        <div class="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <Globe size={14} />
            <span>{ip}</span>
        </div>
    {/if}

    {#if webhook.body && Object.keys(webhook.body).length > 0}
        <div class="bg-gray-50 rounded p-3 border border-gray-200">
            <pre class="text-xs font-mono text-gray-700 overflow-hidden">{formatJson(webhook.body)}</pre>
        </div>
    {:else}
        <div class="text-xs text-gray-400 italic">
            (no body content)
        </div>
    {/if}
</div>