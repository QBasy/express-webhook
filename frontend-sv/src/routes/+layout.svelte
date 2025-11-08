<style global>
    @import "../app.css";
</style>

<script lang="ts">
    import Navbar from '$components/Navbar.svelte';
    import { page } from '$app/stores';

    const publicPages = ['/login', '/register'];
    $: isPublicPage = publicPages.includes($page.url.pathname);
</script>

{#if !isPublicPage}
    <Navbar />
{/if}

<main class="min-h-screen bg-gray-900 text-white">
    <slot />
</main>