<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { authStore, isAdmin } from '$stores/auth';
    import { fetchWithAuth } from '$stores/auth';
    import { Crown, Clock, CheckCircle, XCircle, Inbox, RefreshCw } from 'lucide-svelte';
    import Alert from '$components/Alert.svelte';

    interface User {
        username: string;
        role: string;
        status: 'pending' | 'approved' | 'rejected';
        createdAt: string;
    }

    let allUsers: User[] = [];
    let currentTab: 'pending' | 'approved' | 'rejected' = 'pending';
    let isLoading = true;

    let alertVisible = false;
    let alertMessage = '';
    let alertType: 'success' | 'error' | 'warning' = 'success';

    function showAlert(message: string, type: 'success' | 'error' | 'warning') {
        alertMessage = message;
        alertType = type;
        alertVisible = true;
        setTimeout(() => { alertVisible = false; }, 5000);
    }

    onMount(async () => {
        // Проверяем права админа
        if (!$isAdmin) {
            alert('❌ Доступ запрещен! Только для администраторов.');
            goto('/');
            return;
        }

        await loadUsers();
    });

    async function loadUsers() {
        isLoading = true;
        try {
            const res = await fetchWithAuth('/admin/users');

            if (res.status === 401 || res.status === 403) {
                authStore.forceLogout();
                return;
            }

            if (!res.ok) throw new Error('Ошибка загрузки пользователей');

            const data = await res.json();
            allUsers = data.users.filter((u: User) => u.username !== 'admin');
        } catch (error: any) {
            showAlert(error.message, 'error');
        } finally {
            isLoading = false;
        }
    }

    async function updateUserStatus(username: string, status: 'approved' | 'rejected') {
        try {
            const res = await fetchWithAuth(`/admin/users/${username}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!res.ok) throw new Error('Ошибка обновления статуса');

            showAlert(`Пользователь ${status === 'approved' ? 'одобрен' : 'отклонен'}`, 'success');
            await loadUsers();
        } catch (error: any) {
            showAlert(error.message, 'error');
        }
    }

    async function deleteUser(username: string) {
        if (!confirm(`Удалить пользователя ${username}?`)) return;

        try {
            const res = await fetchWithAuth(`/admin/users/${username}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Ошибка удаления пользователя');

            showAlert('Пользователь удален', 'success');
            await loadUsers();
        } catch (error: any) {
            showAlert(error.message, 'error');
        }
    }

    $: filteredUsers = allUsers.filter(u => u.status === currentTab);
    $: pendingCount = allUsers.filter(u => u.status === 'pending').length;
    $: approvedCount = allUsers.filter(u => u.status === 'approved').length;
    $: rejectedCount = allUsers.filter(u => u.status === 'rejected').length;

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
</script>

<svelte:head>
    <title>Админ панель - Webhook Viewer</title>
</svelte:head>

<div class="bg-gray-50 min-h-screen">
    <!-- Alert -->
    {#if alertVisible}
        <div class="fixed top-20 right-4 z-50 max-w-md">
            <Alert {alertMessage} type={alertType} visible={alertVisible} />
        </div>
    {/if}

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center shadow-md">
                        <Crown size={32} class="text-white" />
                    </div>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Админ панель</h1>
                        <p class="text-gray-600">Управление пользователями и системой</p>
                    </div>
                </div>
                <button on:click={loadUsers} class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2">
                    <RefreshCw size={16} />
                    <span>Обновить</span>
                </button>
            </div>
        </div>

        <!-- Tabs -->
        <div class="mb-6">
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8">
                    <button
                            on:click={() => currentTab = 'pending'}
                            class="py-4 px-1 font-medium flex items-center gap-2 transition {currentTab === 'pending' ? 'border-b-2 border-green-600 text-green-600' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'}"
                    >
                        <Clock size={16} />
                        <span>Ожидают одобрения</span>
                        <span class="ml-2 bg-green-100 text-green-600 px-2.5 py-1 rounded-full text-xs font-semibold">{pendingCount}</span>
                    </button>
                    <button
                            on:click={() => currentTab = 'approved'}
                            class="py-4 px-1 font-medium flex items-center gap-2 transition {currentTab === 'approved' ? 'border-b-2 border-green-600 text-green-600' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'}"
                    >
                        <CheckCircle size={16} />
                        <span>Одобренные</span>
                        <span class="ml-2 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold">{approvedCount}</span>
                    </button>
                    <button
                            on:click={() => currentTab = 'rejected'}
                            class="py-4 px-1 font-medium flex items-center gap-2 transition {currentTab === 'rejected' ? 'border-b-2 border-green-600 text-green-600' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'}"
                    >
                        <XCircle size={16} />
                        <span>Отклоненные</span>
                        <span class="ml-2 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold">{rejectedCount}</span>
                    </button>
                </nav>
            </div>
        </div>

        <!-- Loading -->
        {#if isLoading}
            <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p class="mt-4 text-gray-600">Загрузка пользователей...</p>
            </div>
        {:else if filteredUsers.length === 0}
            <!-- Empty State -->
            <div class="text-center py-12">
                <Inbox size={64} class="text-gray-300 mx-auto mb-4" />
                <p class="text-gray-600 text-lg">Нет пользователей в этой категории</p>
            </div>
        {:else}
            <!-- Users List -->
            <div class="space-y-4">
                {#each filteredUsers as user}
                    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <span class="text-green-600 font-bold text-lg">{user.username[0].toUpperCase()}</span>
                                </div>
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-900">{user.username}</h3>
                                    <p class="text-sm text-gray-600">Роль: <span class="font-medium">{user.role}</span></p>
                                    <p class="text-xs text-gray-500 mt-1">Создан: {formatDate(user.createdAt)}</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-3">
                                {#if currentTab === 'pending'}
                                    <button
                                            on:click={() => updateUserStatus(user.username, 'approved')}
                                            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2"
                                    >
                                        <CheckCircle size={16} />
                                        <span>Одобрить</span>
                                    </button>
                                    <button
                                            on:click={() => updateUserStatus(user.username, 'rejected')}
                                            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2"
                                    >
                                        <XCircle size={16} />
                                        <span>Отклонить</span>
                                    </button>
                                {:else if currentTab === 'rejected'}
                                    <button
                                            on:click={() => updateUserStatus(user.username, 'approved')}
                                            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2"
                                    >
                                        <CheckCircle size={16} />
                                        <span>Одобрить</span>
                                    </button>
                                    <button
                                            on:click={() => deleteUser(user.username)}
                                            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                                    >
                                        Удалить
                                    </button>
                                {:else}
                                    <button
                                            on:click={() => updateUserStatus(user.username, 'rejected')}
                                            class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition flex items-center gap-2"
                                    >
                                        <XCircle size={16} />
                                        <span>Отозвать</span>
                                    </button>
                                    <button
                                            on:click={() => deleteUser(user.username)}
                                            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                    >
                                        Удалить
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </main>
</div>