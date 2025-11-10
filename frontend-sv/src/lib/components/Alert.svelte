<script lang="ts">
    import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-svelte';
    import type { AlertType } from '$lib/types';

    let { message, type }: { message: string; type: AlertType } = $props();

    const config = {
        success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', Icon: CheckCircle },
        error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', Icon: XCircle },
        warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', Icon: AlertCircle },
        info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', Icon: Info }
    };

    const { bg, text, border, Icon } = config[type];
</script>

<div class="fixed top-20 right-4 z-50 animate-slide-in">
    <div class="flex items-center gap-3 p-4 rounded-lg border {bg} {text} {border} shadow-lg max-w-md">
        <Icon size={20} />
        <span>{message}</span>
    </div>
</div>

<style>
    @keyframes slide-in {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
</style>