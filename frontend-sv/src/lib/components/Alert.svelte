<script lang="ts">
    import { CheckCircle, XCircle, AlertCircle } from 'lucide-svelte';
    import { fade, fly } from 'svelte/transition';

    export let type: 'success' | 'error' | 'warning' = 'success';
    export let message: string;
    export let visible: boolean = true;

    const icons = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertCircle
    };

    const colors = {
        success: 'bg-green-100 text-green-800 border-green-300',
        error: 'bg-red-100 text-red-800 border-red-300',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };

    const IconComponent = icons[type];
</script>

{#if visible}
    <div
            transition:fly={{ y: -20, duration: 300 }}
            class="p-4 rounded-lg border {colors[type]} flex items-center gap-3"
    >
        <svelte:component this={IconComponent} size={20} />
        <span>{message}</span>
    </div>
{/if}