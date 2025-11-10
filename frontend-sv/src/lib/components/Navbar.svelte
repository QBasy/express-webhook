<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { currentUser } from '$lib/stores';
    import { clearAuth, isAdmin } from '$lib/auth';
    import { Menu, X, Home, FileText, TestTube, Shield, LogOut, GitCompare, User, ChevronDown } from 'lucide-svelte';

    let mobileMenuOpen = $state(false);
    let userDropdownOpen = $state(false);

    function logout() {
        if (confirm('Вы уверены что хотите выйти?')) {
            clearAuth();
            currentUser.set(null);
            goto('/login');
        }
    }

    function isActive(path: string): boolean {
        return $page.url.pathname === path;
    }

    function closeDropdown() {
        userDropdownOpen = false;
    }

    function toggleDropdown() {
        userDropdownOpen = !userDropdownOpen;
    }
</script>

<svelte:window onclick={(e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.user-dropdown-container')) {
        closeDropdown();
    }
}} />

<nav class="bg-white shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <div class="flex items-center">
                <a href="/" class="flex items-center gap-3 hover:opacity-80 transition">
                    <div class="w-10 h-10">
                        <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100" height="100" rx="12" fill="#3B9702"/>
                            <text x="50" y="70" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">G</text>
                        </svg>
                    </div>
                    <div class="hidden sm:block">
                        <span class="text-xl font-bold text-gray-800">Webhook Viewer</span>
                        <p class="text-xs text-green-600 font-semibold tracking-wide">GREEN-API QA TEAM</p>
                    </div>
                </a>
            </div>

            <div class="hidden md:flex items-center space-x-1">
                <a
                        href="/"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/') ? 'bg-green-600 text-white shadow-md' : 'text-gray-700 hover:bg-green-50 hover:text-green-600'}"
                >
                    <Home size={18} />
                    <span>Главная</span>
                </a>

                <a
                        href="/docs"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/docs') ? 'bg-green-600 text-white shadow-md' : 'text-gray-700 hover:bg-green-50 hover:text-green-600'}"
                >
                    <FileText size={18} />
                    <span>Документация</span>
                </a>

                <a
                        href="/tester"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/tester') ? 'bg-green-600 text-white shadow-md' : 'text-gray-700 hover:bg-green-50 hover:text-green-600'}"
                >
                    <TestTube size={18} />
                    <span>Тестер</span>
                </a>

                <a
                        href="/json-compare"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/json-compare') ? 'bg-green-600 text-white shadow-md' : 'text-gray-700 hover:bg-green-50 hover:text-green-600'}"
                >
                    <GitCompare size={18} />
                    <span>JSON Compare</span>
                </a>

                {#if $currentUser && isAdmin($currentUser)}
                    <a
                            href="/admin"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/admin') ? 'bg-green-600 text-white shadow-md' : 'text-gray-700 hover:bg-green-50 hover:text-green-600'}"
                    >
                        <Shield size={18} />
                        <span>Админ</span>
                    </a>
                {/if}

                {#if $currentUser}
                    <div class="relative ml-4 user-dropdown-container">
                        <button
                                onclick={toggleDropdown}
                                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                        >
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {$currentUser.username.charAt(0).toUpperCase()}
                            </div>
                            <span class="max-w-[100px] truncate">{$currentUser.username}</span>
                            <ChevronDown size={16} class="transition-transform duration-200 {userDropdownOpen ? 'rotate-180' : ''}" />
                        </button>

                        {#if userDropdownOpen}
                            <div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 animate-dropdown">
                                <div class="px-4 py-3 border-b border-gray-100">
                                    <p class="text-sm font-semibold text-gray-800">{$currentUser.username}</p>
                                    <p class="text-xs text-gray-500 mt-1">
                                        {$currentUser.role === 'admin' ? 'Администратор' : 'Пользователь'}
                                    </p>
                                </div>

                                <button
                                        onclick={logout}
                                        class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                                >
                                    <LogOut size={18} />
                                    <span>Выйти</span>
                                </button>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

            <div class="md:hidden flex items-center">
                <button
                        onclick={() => mobileMenuOpen = !mobileMenuOpen}
                        class="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition"
                >
                    {#if mobileMenuOpen}
                        <X size={24} />
                    {:else}
                        <Menu size={24} />
                    {/if}
                </button>
            </div>
        </div>

        {#if mobileMenuOpen}
            <div class="md:hidden pb-4 space-y-1 border-t border-gray-100 pt-2">
                <a
                        href="/"
                        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/') ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-green-50'}"
                >
                    <Home size={18} />
                    <span>Главная</span>
                </a>

                <a
                        href="/docs"
                        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/docs') ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-green-50'}"
                >
                    <FileText size={18} />
                    <span>Документация</span>
                </a>

                <a
                        href="/tester"
                        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/tester') ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-green-50'}"
                >
                    <TestTube size={18} />
                    <span>Тестер</span>
                </a>

                <a
                        href="/json-compare"
                        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/json-compare') ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-green-50'}"
                >
                    <GitCompare size={18} />
                    <span>JSON Compare</span>
                </a>

                {#if $currentUser && isAdmin($currentUser)}
                    <a
                            href="/admin"
                            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 {isActive('/admin') ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-green-50'}"
                    >
                        <Shield size={18} />
                        <span>Админ</span>
                    </a>
                {/if}

                {#if $currentUser}
                    <div class="pt-4 mt-4 border-t border-gray-200 space-y-2">
                        <div class="flex items-center gap-3 px-4 py-2">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold shadow-sm">
                                {$currentUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-gray-800">{$currentUser.username}</p>
                                <p class="text-xs text-gray-500">
                                    {$currentUser.role === 'admin' ? 'Администратор' : 'Пользователь'}
                                </p>
                            </div>
                        </div>

                        <button
                                onclick={logout}
                                class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                        >
                            <LogOut size={18} />
                            <span>Выйти</span>
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</nav>

<style>
    @keyframes dropdown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-dropdown {
        animation: dropdown 0.2s ease-out;
    }
</style>