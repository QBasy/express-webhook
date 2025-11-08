<script lang="ts">
    import { authStore } from '$stores/auth';
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import WebhookViewer from '$components/WebhookViewer.svelte';

    // Проверяем авторизацию
    onMount(async () => {
        const isValid = await authStore.verifyToken();
        if (!isValid) {
            goto('/login');
        }
    });
</script>

<svelte:head>
    <title>Webhook Viewer - GREEN-API QA TEAM</title>
</svelte:head>

<WebhookViewer />