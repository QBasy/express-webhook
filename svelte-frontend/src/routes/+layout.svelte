<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '$stores/auth.svelte';
	import { i18n } from '$stores/i18n.svelte';
	import Navbar from '$components/Navbar.svelte';
	import '../app.css';
	
	const { children } = $props();
	
	onMount(async () => {
		i18n.loadFromStorage();
		authState.loadFromStorage();
		
		// Проверяем токен
		if (authState.token) {
			await authState.verifyToken();
		}
	});
</script>

<svelte:head>
	<title>Webhook Viewer - GREEN-API QA TEAM</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<Navbar />
	
	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
	
	:global(*) {
		box-sizing: border-box;
	}
</style>
