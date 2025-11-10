<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import {
        Check, X, Trash2, Shield, Clock, UserCheck, UserX,
        RefreshCw, Mail, Calendar, Timer, MessageCircle, Settings
    } from 'lucide-svelte';
    import { api } from '$lib/api';
    import { currentUser, showAlert } from '$lib/stores';
    import { isAdmin } from '$lib/auth';
    import type { User } from '$lib/types';

    // ---------- STATE ----------
    let users = $state<User[]>([]);
    let loading = $state(false);
    let currentTab = $state<'pending' | 'approved' | 'rejected'>('pending');

    // ---------- DERIVED ----------
    let filteredUsers = $derived(users.filter(u => u.status === currentTab));
    let pendingCount   = $derived(users.filter(u => u.status === 'pending').length);
    let activeCount    = $derived(users.filter(u => u.status === 'approved').length);
    let rejectedCount  = $derived(users.filter(u => u.status === 'rejected').length);

    // Табы **реактивные**
    let tabs = $derived<Tab[]>([
        { id: 'pending',   label: 'Ожидают одобрения', icon: Clock,     count: pendingCount,   color: 'green' },
        { id: 'approved',  label: 'Одобренные',        icon: UserCheck, count: activeCount,    color: 'green' },
        { id: 'rejected',  label: 'Отклоненные',       icon: UserX,     count: rejectedCount,  color: 'red' }
    ]);

    interface Tab {
        id: 'pending' | 'approved' | 'rejected';
        label: string;
        icon: any;
        count: number;
        color: string;
    }

    // ---------- LOGS ----------
    $effect(() => {
        console.log('filteredUsers:', filteredUsers);
        console.log('counts → pending:', pendingCount, 'approved:', activeCount, 'rejected:', rejectedCount);
    });

    // ---------- MOUNT ----------
    onMount(() => {
        console.log('onMount: currentUser =', $currentUser);
        if (!$currentUser || !isAdmin($currentUser)) {
            showAlert('Доступ запрещен', 'error');
            goto('/');
            return;
        }
        loadUsers();
    });

    // ---------- API ----------
    async function loadUsers() {
        try {
            loading = true;
            const data: any = await api.auth.getUsers();
            console.log('API Response:', data);

            const filtered = (data.users || [])
                .filter((u: any) => u.username !== 'admin')
                .map((u: any) => ({
                    ...u,
                    // Приводим _id → id, чтобы #each работал
                    id: u._id
                }));
            console.log('Filtered users (with id):', filtered);

            users = filtered;
        } catch (error: any) {
            console.error('loadUsers error:', error);
            showAlert(error.message || 'Ошибка загрузки пользователей', 'error');
        } finally {
            loading = false;
        }
    }

    // ---------- ACTIONS ----------
    async function approveUser(userId: string) {
        if (!confirm('Одобрить этого пользователя?')) return;
        try { await api.auth.approveUser(userId); showAlert('Пользователь одобрен!', 'success'); await loadUsers(); }
        catch (e: any) { showAlert(e.message || 'Ошибка одобрения', 'error'); }
    }

    async function rejectUser(userId: string) {
        const reason = prompt('Причина отклонения (опционально):');
        if (reason === null) return;
        try { await api.auth.rejectUser(userId); showAlert('Пользователь отклонен', 'success'); await loadUsers(); }
        catch (e: any) { showAlert(e.message || 'Ошибка отклонения', 'error'); }
    }

    async function deleteUser(userId: string) {
        if (!confirm('Вы уверены? Это действие необратимо!')) return;
        try { await api.auth.deleteUser(userId); showAlert('Пользователь удален', 'success'); await loadUsers(); }
        catch (e: any) { showAlert(e.message || 'Ошибка удаления', 'error'); }
    }

    async function updateTTL(userId: string, currentTTL: number) {
        const input = prompt(`Введите новый TTL (в секундах):`, String(currentTTL));
        if (!input) return;
        const ttl = parseInt(input);
        if (isNaN(ttl) || ttl < 60 || ttl > 86400) { showAlert('TTL от 60 до 86400 сек', 'error'); return; }
        try { await api.auth.updateUserTTL(userId, ttl); showAlert('TTL обновлён', 'success'); await loadUsers(); }
        catch (e: any) { showAlert(e.message || 'Ошибка обновления TTL', 'error'); }
    }

    // ---------- UI HELPERS ----------
    function getStatusBadge(status: string) {
        return {
            pending:  { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock,     label: 'Ожидает' },
            approved: { bg: 'bg-green-100',  text: 'text-green-800',  icon: UserCheck, label: 'Активен' },
            rejected: { bg: 'bg-red-100',    text: 'text-red-800',    icon: UserX,     label: 'Отклонен' }
        }[status] ?? { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: status };
    }

    function getRoleBadge(role: string) {
        return role === 'admin'
            ? { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Админ' }
            : { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Пользователь' };
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleString('ru-RU', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
</script>

<svelte:head><title>Админ панель - Webhook Viewer</title></svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield size={36} class="text-white" />
            </div>
            <div>
                <h1 class="text-3xl font-bold text-gray-900">Админ панель</h1>
                <p class="text-gray-600">Управление пользователями и системой</p>
            </div>
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

    <!-- Tabs -->
    <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
            {#each tabs as tab}
                <button
                        onclick={() => currentTab = tab.id}
                        class="group relative py-4 px-1 font-medium flex items-center gap-2 transition-all border-b-2
                           {currentTab === tab.id
                             ? 'border-green-600 text-green-600'
                             : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                >
                    <svelte:component this={tab.icon} size={18} />
                    <span>{tab.label}</span>
                    <span class="ml-2 px-2.5 py-1 rounded-full text-xs font-semibold
                                 {currentTab === tab.id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}">
                        {tab.count}
                    </span>
                </button>
            {/each}
        </nav>
    </div>

    <!-- States -->
    {#if loading && users.length === 0}
        <div class="bg-white rounded-xl shadow-sm p-12 text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p class="text-gray-500">Загрузка пользователей...</p>
        </div>
    {:else if filteredUsers.length === 0}
        <div class="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p class="text-gray-600 text-lg">Нет пользователей в этой категории</p>
        </div>
    {:else}
        <div class="space-y-4">
            {#each filteredUsers as user (user.id)}
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in">
                    <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

                        <!-- Info -->
                        <div class="flex-1">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md
                                             {user.status === 'pending' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                              user.status === 'approved' ? 'bg-gradient-to-br from-green-400 to-green-600' :
                                              'bg-gradient-to-br from-red-400 to-red-600'}">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-bold text-gray-800">{user.username}</h3>
                                    <div class="flex flex-wrap items-center gap-2 mt-1">
                                        <span class="px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1
                                                     {getStatusBadge(user.status).bg} {getStatusBadge(user.status).text}">
                                            <svelte:component this={getStatusBadge(user.status).icon} size={12} />
                                            {getStatusBadge(user.status).label}
                                        </span>
                                        {#if user.role === 'admin'}
                                            <span class="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                                <Shield size={12} /> Админ
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-2 text-sm text-gray-600 ml-18">
                                {#if user.email}
                                    <div class="flex items-center gap-2"><Mail size={16} /><span>{user.email}</span></div>
                                {/if}
                                <div class="flex items-center gap-2"><Calendar size={16} />
                                    <span>Зарегистрирован: <strong>{formatDate(user.createdAt)}</strong></span>
                                </div>
                                <div class="flex items-center gap-2"><Timer size={16} />
                                    <span>TTL вебхуков: <strong>{user.webhookTTL}s ({(user.webhookTTL / 3600).toFixed(1)}ч)</strong></span>
                                </div>
                            </div>

                            {#if user.reason}
                                <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 ml-18">
                                    <p class="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                                        <MessageCircle size={14} /> Причина регистрации:
                                    </p>
                                    <p class="text-sm text-gray-700">{user.reason}</p>
                                </div>
                            {/if}
                        </div>

                        <!-- Buttons -->
                        <div class="flex flex-col gap-2 lg:ml-4">
                            {#if currentTab === 'pending'}
                                <button onclick={() => approveUser(user.id)}
                                        class="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-semibold">
                                    <Check size={16} /> Одобрить
                                </button>
                                <button onclick={() => rejectUser(user.id)}
                                        class="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-semibold">
                                    <X size={16} /> Отклонить
                                </button>
                            {:else if currentTab === 'approved'}
                                <button onclick={() => updateTTL(user.id, user.webhookTTL)}
                                        class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold">
                                    <Settings size={16} /> Изменить TTL
                                </button>
                                {#if user.id !== $currentUser?.id}
                                    <button onclick={() => deleteUser(user.id)}
                                            class="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-semibold">
                                        <Trash2 size={16} /> Удалить
                                    </button>
                                {/if}
                            {:else if currentTab === 'rejected'}
                                <button onclick={() => approveUser(user.id)}
                                        class="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-semibold">
                                    <Check size={16} /> Одобрить
                                </button>
                                <button onclick={() => deleteUser(user.id)}
                                        class="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-semibold">
                                    <Trash2 size={16} /> Удалить
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to   { opacity: 1; transform: translateY(0); }
    }
</style>