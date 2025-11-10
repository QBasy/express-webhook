<script lang="ts">
    let { isOnline, reconnectAttempts = 0 }: { isOnline: boolean; reconnectAttempts?: number } = $props();
</script>

<div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-3 {isOnline ? 'bg-green-100 text-green-700' : reconnectAttempts > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">
    <span class="w-2 h-2 rounded-full {isOnline ? 'bg-green-500 animate-pulse' : reconnectAttempts > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}"></span>
    <span>
        {#if isOnline}
            Подключено
        {:else if reconnectAttempts > 0}
            Переподключение... ({reconnectAttempts})
        {:else}
            Нет соединения
        {/if}
    </span>
</div>