<script lang="ts">
    import { authStore, isAuthenticated, isAdmin, currentUser } from '$stores/auth';
    import { page } from '$app/stores';
    import { Menu, X, Home, Settings, Users, LogOut, User } from 'lucide-svelte';

    let mobileMenuOpen = false;

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }

    function handleLogout() {
        authStore.logout();
        mobileMenuOpen = false;
    }

    // Закрываем меню при переходе
    $: if ($page.url.pathname) {
        mobileMenuOpen = false;
    }
</script>

{#if $isAuthenticated}
    <nav class="bg-white shadow-lg fixed w-full top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <!-- Logo & Title -->
                <div class="flex items-center">
                    <a href="/" class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                            <span class="text-white font-bold text-xl">G</span>
                        </div>
                        <div class="hidden sm:block">
                            <span class="text-xl font-bold text-gray-800">Webhook Viewer</span>
                            <p class="text-xs text-green-600 font-semibold">GREEN-API QA TEAM</p>
                        </div>
                    </a>
                </div>

                <!-- Desktop Navigation -->
                <div class="hidden md:flex items-center space-x-4">
                    <a
                            href="/"
                            class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition
							{$page.url.pathname === '/' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}"
                    >
                        <Home size={18} />
                        <span>Главная</span>
                    </a>

                    {#if $isAdmin}
                        <a
                                href="/admin"
                                class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition
								{$page.url.pathname === '/admin' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}"
                        >
                            <Users size={18} />
                            <span>Админ панель</span>
                        </a>
                    {/if}

                    <a
                            href="/tester"
                            class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition
							{$page.url.pathname === '/tester' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}"
                    >
                        <Settings size={18} />
                        <span>API Tester</span>
                    </a>

                    <!-- User Menu -->
                    <div class="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                        <div class="flex items-center gap-2 text-sm">
                            <User size={18} class="text-gray-500" />
                            <span class="font-medium text-gray-700">{$currentUser?.username}</span>
                            {#if $isAdmin}
                                <span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">Admin</span>
                            {/if}
                        </div>
                        <button
                                on:click={handleLogout}
                                class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition"
                        >
                            <LogOut size={18} />
                            <span>Выйти</span>
                        </button>
                    </div>
                </div>

                <div class="md:hidden flex items-center">
                    <button
                            on:click={toggleMobileMenu}
                            class="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 transition"
                    >
                        {#if mobileMenuOpen}
                            <X size={24} />
                        {:else}
                            <Menu size={24} />
                        {/if}
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile menu -->
        {#if mobileMenuOpen}
            <div class="md:hidden border-t border-gray-200 bg-white">
                <div class="px-2 pt-2 pb-3 space-y-1">
                    <!-- User Info -->
                    <div class="px-3 py-2 border-b border-gray-200 mb-2">
                        <div class="flex items-center gap-2">
                            <User size={18} class="text-gray-500" />
                            <span class="font-medium text-gray-700">{$currentUser?.username}</span>
                            {#if $isAdmin}
                                <span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">Admin</span>
                            {/if}
                        </div>
                    </div>

                    <a
                            href="/"
                            class="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition
							{$page.url.pathname === '/' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}"
                    >
                        <Home size={20} />
                        <span>Главная</span>
                    </a>

                    {#if $isAdmin}
                        <a
                                href="/admin"
                                class="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition
								{$page.url.pathname === '/admin' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}"
                        >
                            <Users size={20} />
                            <span>Админ панель</span>
                        </a>
                    {/if}

                    <a
                            href="/tester"
                            class="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition
							{$page.url.pathname === '/tester' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}"
                    >
                        <Settings size={20} />
                        <span>API Tester</span>
                    </a>

                    <button
                            on:click={handleLogout}
                            class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition"
                    >
                        <LogOut size={20} />
                        <span>Выйти</span>
                    </button>
                </div>
            </div>
        {/if}
    </nav>

    <div class="h-16"></div>
{/if}

<style>
    nav {
        transition: all 0.3s ease;
    }
</style>