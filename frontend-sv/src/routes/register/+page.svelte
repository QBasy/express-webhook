<script lang="ts">
    import { goto } from '$app/navigation';
    import { Eye, EyeOff, UserPlus, User, Lock, ArrowLeft, ExternalLink } from 'lucide-svelte';
    import { api } from '$lib/api';
    import { showAlert } from '$lib/stores';

    let username = $state('');
    let password = $state('');
    let confirmPassword = $state('');
    let showPassword = $state(false);
    let showConfirmPassword = $state(false);
    let loading = $state(false);

    async function handleRegister(e: Event) {
        e.preventDefault();

        if (!username.trim() || !password || !confirmPassword) {
            showAlert('Заполните все поля', 'error');
            return;
        }

        if (username.length < 3) {
            showAlert('Имя пользователя должно содержать минимум 3 символа', 'error');
            return;
        }

        if (password.length < 4) {
            showAlert('Пароль должен содержать минимум 4 символа', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Пароли не совпадают', 'error');
            return;
        }

        loading = true;

        try {
            await api.auth.register(username.trim(), password);
            showAlert('Регистрация успешна! Ожидайте одобрения администратора', 'success');

            setTimeout(() => {
                goto('/login');
            }, 2000);

        } catch (error: any) {
            showAlert(error.message || 'Ошибка регистрации', 'error');
            loading = false;
        }
    }

    function togglePassword() {
        showPassword = !showPassword;
    }

    function toggleConfirmPassword() {
        showConfirmPassword = !showConfirmPassword;
    }
</script>

<svelte:head>
    <title>Регистрация - Webhook Viewer</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 pt-24 bg-gradient-to-br from-green-500 via-green-600 to-green-700">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div class="text-center mb-8">
            <div class="mx-auto mb-4 animate-float" style="width: 80px;">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="12" fill="#3B9702"/>
                    <text x="50" y="70" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">G</text>
                </svg>
            </div>
            <h1 class="text-3xl font-bold text-gray-800">Webhook Viewer</h1>
            <p class="text-green-600 font-semibold mt-2 tracking-wide">GREEN-API QA TEAM</p>
            <p class="text-gray-500 mt-2 text-sm">Создайте новый аккаунт</p>
        </div>

        <form onsubmit={handleRegister} class="space-y-6">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User size={16} class="text-gray-500" />
                    <span>Имя пользователя</span>
                </label>
                <input
                        type="text"
                        bind:value={username}
                        required
                        disabled={loading}
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                        placeholder="Минимум 3 символа"
                />
            </div>

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
                            disabled={loading}
                            class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="Минимум 4 символа"
                    />
                    <button
                            type="button"
                            onclick={togglePassword}
                            disabled={loading}
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

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Lock size={16} class="text-gray-500" />
                    <span>Подтвердите пароль</span>
                </label>
                <div class="relative">
                    <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            bind:value={confirmPassword}
                            required
                            disabled={loading}
                            class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="Повторите пароль"
                    />
                    <button
                            type="button"
                            onclick={toggleConfirmPassword}
                            disabled={loading}
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
                    >
                        {#if showConfirmPassword}
                            <EyeOff size={20} />
                        {:else}
                            <Eye size={20} />
                        {/if}
                    </button>
                </div>
            </div>

            <button
                    type="submit"
                    disabled={loading}
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {#if loading}
                    <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Регистрация...</span>
                {:else}
                    <UserPlus size={20} />
                    <span>Зарегистрироваться</span>
                {/if}
            </button>
        </form>

        <div class="mt-6 text-center space-y-2">
            <p class="text-sm text-gray-600 flex items-center justify-center gap-1">
                <span>Уже есть аккаунт?</span>
                <a href="/login" class="text-green-600 hover:text-green-800 font-semibold transition flex items-center gap-1">
                    <ArrowLeft size={16} />
                    <span>Войти</span>
                </a>
            </p>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-200">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p class="text-sm text-blue-800">
                    <strong>Примечание:</strong> После регистрации ваша заявка будет отправлена администратору на одобрение.
                </p>
            </div>

            <div class="text-center">
                <a href="https://green-api.com" target="_blank" class="inline-flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold transition">
                    <span>GREEN-API</span>
                    <ExternalLink size={16} />
                </a>
                <p class="text-xs text-gray-500 mt-2">© 2025 Webhook Viewer</p>
            </div>
        </div>
    </div>
</div>

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes float {
        0%, 100% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-10px);
        }
    }

    .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
    }

    .animate-float {
        animation: float 3s ease-in-out infinite;
    }
</style>