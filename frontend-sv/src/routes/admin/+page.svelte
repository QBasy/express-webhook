<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Check, X, Trash2, Shield, Clock, UserCheck, UserX, RefreshCw } from 'lucide-svelte';
    import { api } from '$lib/api';
    import { currentUser, showAlert } from '$lib/stores';
    import { isAdmin } from '$lib/auth';
    import type { User } from '$lib/types';

    let users = $state<User[]>([]);
    let loading = $state(false);

    onMount(() => {
        if (!$currentUser || !isAdmin($currentUser)) {
            showAlert('Доступ запрещен', 'error');
            goto('/');
            return;
        }
        loadUsers();
    });

    async function loadUsers() {
        try {
            loading = true;
            const data: any = await api.auth.getUsers();
            users = data.users || [];
        } catch (error: any) {
            showAlert(error.message || 'Ошибка загрузки пользователей', 'error');
        } finally {
            loading = false;
        }
    }

    async function approveUser(userId: string) {
        try {
            await api.auth.approveUser(userId);
            showAlert('Пользователь одобрен', 'success');
            await loadUsers();
        } catch (error: any) {
            showAlert(error.message || 'Ошибка одобрения пользователя', 'error');
        }
    }

    async function rejectUser(userId: string) {
        if (!confirm('Вы уверены что хотите отклонить этого пользователя?')) return;

        try {
            await api.auth.rejectUser(userId);
            showAlert('Пользователь отклонен', 'success');
            await loadUsers();
        } catch (error: any) {
            showAlert(error.message || 'Ошибка отклонения пользователя', 'error');
        }
    }

    async function deleteUser(userId: string) {
        if (!confirm('Вы уверены что хотите удалить этого пользователя?')) return;

        try {
            await api.auth.deleteUser(userId);
            showAlert('Пользователь удален', 'success');
            await loadUsers();
        } catch (error: any) {
            showAlert(error.message || 'Ошибка удаления пользователя', 'error');
        }
    }

    function getStatusBadge(status: string) {
        const badges = {
            active: { bg: 'bg-green-100', text: 'text-green-800', icon: UserCheck, label: 'Активен' },
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Ожидает' },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: UserX, label: 'Отклонен' }
        };
        return badges[status as keyof typeof badges] || badges.pending;
    }

    function getRoleBadge(role: string) {
        return role === 'admin'
            ? { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Админ' }
            : { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Пользователь' };
    }

    let pendingUsers = $derived(users.filter(u => u.status === 'pending'));
    let activeUsers = $derived(users.filter(u => u.status === 'active'));
    let rejectedUsers = $derived(users.filter(u => u.status === 'rejected'));
</script>

<svelte:head>
    <title>Админ панель - Webhook Viewer</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8 flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Shield size={32} class="text-purple-600" />
                <span>Панель администратора</span>
            </h1>
            <p class="text-gray-600 mt-2">Управление пользователями и их доступом</p>
        </div>

        <button
                onclick={loadUsers}
                disabled={loading}
                class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
        >
            <RefreshCw size={18} class={loading ? 'animate-spin' : ''} />
            <span>Обновить</span>
        </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-yellow-800 text-sm font-medium">Ожидают одобрения</p>
                    <p class="text-3xl font-bold text-yellow-900 mt-2">{pendingUsers.length}</p>
                </div>
                <Clock size={40} class="text-yellow-600" />
            </div>
        </div>

        <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-green-800 text-sm font-medium">Активные</p>
                    <p class="text-3xl font-bold text-green-900 mt-2">{activeUsers.length}</p>
                </div>
                <UserCheck size={40} class="text-green-600" />
            </div>
        </div>

        <div class="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-red-800 text-sm font-medium">Отклоненные</p>
                    <p class="text-3xl font-bold text-red-900 mt-2">{rejectedUsers.length}</p>
                </div>
                <UserX size={40} class="text-red-600" />
            </div>
        </div>
    </div>

    {#if loading && users.length === 0}
        <div class="bg-white rounded-lg shadow-md p-12 text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p class="text-gray-500">Загрузка пользователей...</p>
        </div>
    {:else if users.length === 0}
        <div class="bg-white rounded-lg shadow-md p-12 text-center">
            <p class="text-gray-500">Нет пользователей</p>
        </div>
    {:else}
        <div class="space-y-6">
            {#if pendingUsers.length > 0}
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <div class="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
                        <h2 class="text-lg font-semibold text-yellow-900 flex items-center gap-2">
                            <Clock size={20} />
                            <span>Ожидают одобрения ({pendingUsers.length})</span>
                        </h2>
                    </div>
                    <div class="divide-y divide-gray-200">
                        {#each pendingUsers as user (user.id)}
                            <div class="p-6 hover:bg-gray-50 transition">
                                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p class="font-semibold text-gray-800">{user.username}</p>
                                                <p class="text-sm text-gray-500">
                                                    Зарегистрирован: {new Date(user.createdAt).toLocaleString('ru-RU')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button
                                                onclick={() => approveUser(user.id)}
                                                class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                                        >
                                            <Check size={18} />
                                            <span>Одобрить</span>
                                        </button>
                                        <button
                                                onclick={() => rejectUser(user.id)}
                                                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                        >
                                            <X size={18} />
                                            <span>Отклонить</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            {#if activeUsers.length > 0}
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <div class="bg-green-50 border-b border-green-200 px-6 py-4">
                        <h2 class="text-lg font-semibold text-green-900 flex items-center gap-2">
                            <UserCheck size={20} />
                            <span>Активные пользователи ({activeUsers.length})</span>
                        </h2>
                    </div>
                    <div class="divide-y divide-gray-200">
                        {#each activeUsers as user (user.id)}
                            <div class="p-6 hover:bg-gray-50 transition">
                                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div class="flex items-center gap-2">
                                                    <p class="font-semibold text-gray-800">{user.username}</p>
                                                    {#if user.role === 'admin'}
                                                        <span class="px-2 py-1 rounded-full text-xs font-medium {getRoleBadge(user.role).bg} {getRoleBadge(user.role).text}">
                                                            <Shield size={12} class="inline mr-1" />
                                                            {getRoleBadge(user.role).label}
                                                        </span>
                                                    {/if}
                                                </div>
                                                <p class="text-sm text-gray-500">
                                                    Зарегистрирован: {new Date(user.createdAt).toLocaleString('ru-RU')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {#if user.id !== $currentUser?.id}
                                        <button
                                                onclick={() => deleteUser(user.id)}
                                                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                        >
                                            <Trash2 size={18} />
                                            <span>Удалить</span>
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            {#if rejectedUsers.length > 0}
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <div class="bg-red-50 border-b border-red-200 px-6 py-4">
                        <h2 class="text-lg font-semibold text-red-900 flex items-center gap-2">
                            <UserX size={20} />
                            <span>Отклоненные пользователи ({rejectedUsers.length})</span>
                        </h2>
                    </div>
                    <div class="divide-y divide-gray-200">
                        {#each rejectedUsers as user (user.id)}
                            <div class="p-6 hover:bg-gray-50 transition">
                                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p class="font-semibold text-gray-800">{user.username}</p>
                                                <p class="text-sm text-gray-500">
                                                    Зарегистрирован: {new Date(user.createdAt).toLocaleString('ru-RU')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button
                                                onclick={() => approveUser(user.id)}
                                                class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                                        >
                                            <Check size={18} />
                                            <span>Одобрить</span>
                                        </button>
                                        <button
                                                onclick={() => deleteUser(user.id)}
                                                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                        >
                                            <Trash2 size={18} />
                                            <span>Удалить</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>