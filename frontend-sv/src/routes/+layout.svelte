<script lang="ts">
    import "../app.css"
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { currentUser, alert as alertStore } from '$lib/stores';
    import { api } from '$lib/api';
    import { getStoredUser, isAuthenticated, clearAuth } from '$lib/auth';
    import Navbar from '$lib/components/Navbar.svelte';
    import Alert from '$lib/components/Alert.svelte';

    let { children } = $props();

    const publicPaths = ['/login', '/register', '/docs'];

    onMount(async () => {
        const path = $page.url.pathname;
        const isPublic = publicPaths.some(p => path === p || path.startsWith(p));

        if (!isAuthenticated() && !isPublic) {
            goto('/login');
            return;
        }

        if (isAuthenticated() && (path === '/login' || path === '/register')) {
            goto('/');
            return;
        }

        if (isAuthenticated()) {
            try {
                const user = await api.auth.me();
                currentUser.set(user);
            } catch {
                clearAuth();
                goto('/login');
            }
        } else {
            const storedUser = getStoredUser();
            if (storedUser) {
                currentUser.set(storedUser);
            }
        }
    });
</script>

<div class="min-h-screen bg-gray-50">
    {#if $page.url.pathname !== '/login' && $page.url.pathname !== '/register'}
        <Navbar />
    {/if}

    {#if $alertStore}
        <Alert message={$alertStore.message} type={$alertStore.type} />
    {/if}

    <main>
        {@render children()}
    </main>
</div>