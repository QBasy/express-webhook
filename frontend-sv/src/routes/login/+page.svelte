<script lang="ts">
    import { authStore } from '$stores/auth';
    import { goto } from '$app/navigation';
    import { Eye, EyeOff, LogIn, User, Lock, ArrowRight, ExternalLink } from 'lucide-svelte';
    import Alert from '$components/Alert.svelte';

    let username = 'admin';
    let password = 'admin';
    let showPassword = false;
    let isLoading = false;

    let alertVisible = false;
    let alertMessage = '';
    let alertType: 'success' | 'error' | 'warning' = 'success';

    function togglePassword() {
        showPassword = !showPassword;
    }

    function showAlert(message: string, type: 'success' | 'error' | 'warning') {
        alertMessage = message;
        alertType = type;
        alertVisible = true;

        if (type !== 'success') {
            setTimeout(() => {
                alertVisible = false;
            }, 5000);
        }
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();

        if (!username.trim() || !password) {
            showAlert('Заполните все поля', 'error');
            return;
        }

        isLoading = true;

        try {
            await authStore.login(username.trim(), password);
            showAlert('Успешный вход! Перенаправление...', 'success');

            setTimeout(() => {
                goto('/');
            }, 500);
        } catch (error: any) {
            showAlert(error.message || 'Ошибка входа', 'error');
            isLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Вход - Webhook Viewer</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-500 via-green-600 to-green-700">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <!-- Header -->
        <div class="text-center mb-8">
            <div class="mx-auto mb-4 animate-float" style="width: 80px;">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="12" fill="#3B9702"/>
                    <text x="50" y="70" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">G</text>
                </svg>
            </div>
            <h1 class="text-3xl font-bold text-gray-800">Webhook Viewer</h1>
            <p class="text-green-600 font-semibold mt-2 tracking-wide">GREEN-API QA TEAM</p>
            <p class="text-gray-500 mt-2 text-sm">Войдите в свой аккаунт</p>
        </div>

        <!-- Alert -->
        {#if alertVisible}
            <div class="mb-4">
                <Alert {alertMessage} type={alertType} visible={alertVisible} />
            </div>
        {/if}

        <!-- Login Form -->
        <form on:submit={handleSubmit} class="space-y-6">
            <!-- Username -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User size={16} class="text-gray-500" />
                    <span>Имя пользователя</span>
                </label>
                <input
                        type="text"
                        bind:value={username}
                        required
                        disabled={isLoading}
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600 focus:ring-3 focus:ring-green-100 transition disabled:bg-gray-100"
                        placeholder="Введите имя пользователя"
                />
            </div>

            <!-- Password -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Lock size={16} class="text-gray-500" />
                    <span>Пароль</span>
                </label>
                <div class="relative">
                    <input
                            type={showPassword ? 'text' : 'password'}
                            bind:value={password}
                            required
                            disabled={isLoading}
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600 focus:ring-3 focus:ring-green-100 transition disabled:bg-gray-100 pr-12"
                            placeholder="Введите пароль"
                    />
                    <button
                            type="button"
                            on:click={togglePassword}
                            disabled={isLoading}
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
                    >
                        {#if showPassword}
                            <EyeOff size={20} />
                        {:else}
                            <Eye size={20} />
                        {/if}
                    </button>
                </div>
            </div>

            <!-- Submit Button -->
            <button
                    type="submit"
                    disabled={isLoading}
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {#if isLoading}
                    <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Вход...</span>
                {:else}
                    <LogIn size={20} />
                    <span>Войти</span>
                {/if}
            </button>
        </form>

        <!-- Register Link -->
        <div class="mt-6 text-center space-y-2">
            <p class="text-sm text-gray-600 flex items-center justify-center gap-1">
                <span>Нет аккаунта?</span>
                <a
                        href="/register"
                        class="text-green-600 hover:text-green-800 font-semibold transition flex items-center gap-1"
                >
                    <span>Зарегистрироваться</span>
                    <ArrowRight size={16} />
                </a>
            </p>
        </div>

        <!-- Footer -->
        <div class="mt-8 pt-6 border-t border-gray-200 text-center">
            <a
                    href="https://green-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold transition"
            >
                <span>GREEN-API</span>
                <ExternalLink size={16} />
            </a>
            <p class="text-xs text-gray-500 mt-2">© 2025 Webhook Viewer</p>
        </div>
    </div>
</div>

<style>
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }

    .animate-float {
        animation: float 3s ease-in-out infinite;
    }

    .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>