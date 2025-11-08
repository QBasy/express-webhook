<script lang="ts">
    import { authStore } from '$stores/auth';
    import { goto } from '$app/navigation';
    import { Eye, EyeOff, UserPlus, User, Lock, ArrowRight, ExternalLink, CheckCircle } from 'lucide-svelte';
    import Alert from '$components/Alert.svelte';

    let username = '';
    let password = '';
    let confirmPassword = '';
    let showPassword = false;
    let showConfirmPassword = false;
    let isLoading = false;
    let registrationSuccess = false;

    let alertVisible = false;
    let alertMessage = '';
    let alertType: 'success' | 'error' | 'warning' = 'success';

    function togglePassword() {
        showPassword = !showPassword;
    }

    function toggleConfirmPassword() {
        showConfirmPassword = !showConfirmPassword;
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

        if (!username.trim() || !password || !confirmPassword) {
            showAlert('Заполните все поля', 'error');
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

        isLoading = true;

        try {
            const result = await authStore.register(username.trim(), password);
            showAlert(result.message || 'Регистрация успешна! Ожидайте одобрения администратора', 'success');
            registrationSuccess = true;
        } catch (error: any) {
            showAlert(error.message || 'Ошибка регистрации', 'error');
            isLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Регистрация - Webhook Viewer</title>
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
            <p class="text-gray-500 mt-2 text-sm">Создайте новый аккаунт</p>
        </div>

        {#if registrationSuccess}
            <!-- Success State -->
            <div class="text-center space-y-4">
                <div class="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={40} class="text-green-600" />
                </div>
                <h2 class="text-2xl font-bold text-gray-800">Регистрация успешна!</h2>
                <p class="text-gray-600">
                    Ваша заявка отправлена администратору.<br />
                    После одобрения вы сможете войти в систему.
                </p>
                <a
                        href="/login"
                        class="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition transform hover:scale-105"
                >
                    <span>Перейти на страницу входа</span>
                    <ArrowRight size={20} />
                </a>
            </div>
        {:else}
            <!-- Alert -->
            {#if alertVisible}
                <div class="mb-4">
                    <Alert {alertMessage} type={alertType} visible={alertVisible} />
                </div>
            {/if}

            <!-- Registration Form -->
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
                                placeholder="Введите пароль (минимум 4 символа)"
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

                <!-- Confirm Password -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Lock size={16} class="text-gray-500" />
                        <span>Подтверждение пароля</span>
                    </label>
                    <div class="relative">
                        <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                bind:value={confirmPassword}
                                required
                                disabled={isLoading}
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600 focus:ring-3 focus:ring-green-100 transition disabled:bg-gray-100 pr-12"
                                placeholder="Повторите пароль"
                        />
                        <button
                                type="button"
                                on:click={toggleConfirmPassword}
                                disabled={isLoading}
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

                <!-- Info Message -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-sm text-blue-800">
                        <strong>Обратите внимание:</strong> После регистрации ваша заявка будет отправлена администратору для одобрения.
                    </p>
                </div>

                <!-- Submit Button -->
                <button
                        type="submit"
                        disabled={isLoading}
                        class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {#if isLoading}
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Регистрация...</span>
                    {:else}
                        <UserPlus size={20} />
                        <span>Зарегистрироваться</span>
                    {/if}
                </button>
            </form>

            <!-- Login Link -->
            <div class="mt-6 text-center space-y-2">
                <p class="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>Уже есть аккаунт?</span>
                    <a
                            href="/login"
                            class="text-green-600 hover:text-green-800 font-semibold transition flex items-center gap-1"
                    >
                        <span>Войти</span>
                        <ArrowRight size={16} />
                    </a>
                </p>
            </div>
        {/if}

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