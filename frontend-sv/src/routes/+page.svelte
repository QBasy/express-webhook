<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Trash2, RefreshCw, Copy, Check, Send, Download, AlertTriangle, ArrowRightCircle, Folder, Database, Home } from 'lucide-svelte';
    import { api } from '$lib/api';
    import { currentUser, showAlert } from '$lib/stores';
    import { browser } from '$app/environment';
    import WebhookCard from '$lib/components/WebhookCard.svelte';
    import WebhookModal from '$lib/components/WebhookModal.svelte';
    import RoomsPanel from '$lib/components/RoomsPanel.svelte';
    import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import type { Room, Webhook } from '$lib/types';

    let currentRoomId = $state<string | null>(null);
    let roomIdInput = $state('');
    let webhooks = $state<any[]>([]);

    let loading = $state(false);
    let webhooksLoading = $state(false);
    let isOnline = $state(true);
    let reconnectAttempts = $state(0);

    // Server-side pagination
    let serverPage = $state(1);
    let serverLimit = $state(25);
    let serverTotal = $state(0);
    let serverTotalPages = $state(1);

    let fakeErrorEnabled = $state(false);
    let fakeStatusCode = $state(500);

    let forwardEnabled = $state(false);
    let forwardEndpoint = $state('');

    let selectedWebhook = $state<any | null>(null);
    let isModalOpen = $state(false);

    let isRoomsPanelOpen = $state(false);

    let webhookUrl = $state('');
    let copied = $state(false);

    let pollInterval: any;
    let reconnectTimeout: any;

    onMount(() => {
        if (browser) {
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        return () => {
            if (browser) {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            }
        };
    });

    onDestroy(() => {
        stopPolling();
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
    });

    function handleOnline() {
        isOnline = true;
        reconnectAttempts = 0;
        if (currentRoomId) {
            showAlert('Интернет-соединение восстановлено', 'success');
            startPolling();
        }
    }

    function handleOffline() {
        isOnline = false;
        showAlert('Потеряно интернет-соединение', 'error');
        stopPolling();
    }

    function startPolling() {
        stopPolling();
        pollInterval = setInterval(async () => {
            if (currentRoomId && isOnline) {
                await loadWebhooks(true);
            }
        }, 3000);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function attemptReconnect() {
        if (isOnline || !currentRoomId) return;

        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

        reconnectTimeout = setTimeout(async () => {
            try {
                await api.webhooks.getAll(currentRoomId!, serverPage, serverLimit);
                isOnline = true;
                reconnectAttempts = 0;
                showAlert('Соединение восстановлено', 'success');
                startPolling();
            } catch {
                attemptReconnect();
            }
        }, delay);
    }

    async function createOrJoinRoom() {
        const id = roomIdInput.trim();
        if (!id) {
            showAlert('Введите ID комнаты', 'warning');
            return;
        }

        try {
            loading = true;
            currentRoomId = id;
            webhooks = [];
            serverPage = 1;
            serverTotal = 0;
            serverTotalPages = 1;

            await api.rooms.getRoom(id);

            if (browser) {
                webhookUrl = `${"https://webhook-ga.onrender.com"}/hook/${encodeURIComponent(id)}`;
            }

            await loadFakeErrorStatus();
            await loadWebhooks();
            startPolling();

            isOnline = true;
            reconnectAttempts = 0;
            showAlert('Комната создана/открыта успешно', 'success');
        } catch (error: any) {
            showAlert(error.message || 'Ошибка создания комнаты', 'error');
            isOnline = false;
            attemptReconnect();
        } finally {
            loading = false;
        }
    }

    async function closeRoom() {
        if (!currentRoomId) {
            showAlert('Нет активной комнаты', 'warning');
            return;
        }

        try {
            await api.rooms.delete(currentRoomId);
            stopPolling();

            currentRoomId = null;
            webhookUrl = '';
            webhooks = [];
            serverPage = 1;
            serverTotal = 0;
            serverTotalPages = 1;

            fakeErrorEnabled = false;
            fakeStatusCode = 500;

            showAlert('Комната закрыта', 'success');
        } catch (error: any) {
            console.error('Close room error:', error);
        }
    }

    async function loadWebhooks(silent = false) {
        if (!currentRoomId) return;

        try {
            if (!silent) webhooksLoading = true;

            const data = await api.webhooks.getAll(currentRoomId, serverPage, serverLimit);

            console.log('API Response:', data);
            console.log('webhooks assigned:', data.webhooks);
            console.log('webhooks length:', (data.webhooks || []).length);

            webhooks = data.webhooks || [];
            serverTotal = data.total || 0;
            serverPage = data.page || 1;
            serverTotalPages = data.totalPages || 1;

            if (!isOnline) {
                isOnline = true;
                reconnectAttempts = 0;
            }
        } catch (error: any) {
            if (!silent) {
                showAlert(error.message || 'Ошибка загрузки вебхуков', 'error');
                isOnline = false;
                attemptReconnect();
            }
        } finally {
            if (!silent) webhooksLoading = false;
        }
    }

    async function clearAllWebhooks() {
        if (!currentRoomId) {
            showAlert('Нет активной комнаты', 'warning');
            return;
        }

        if (!confirm('Вы уверены что хотите очистить все вебхуки?')) return;

        try {
            await api.webhooks.deleteAll(currentRoomId);
            serverPage = 1;
            await loadWebhooks();
            showAlert('Вебхуки очищены', 'success');
        } catch (error: any) {
            showAlert(error.message || 'Ошибка очистки', 'error');
        }
    }

    async function deleteWebhook(receiptId: string) {
        if (!currentRoomId) return;

        try {
            await api.webhooks.deleteOne(currentRoomId, receiptId);
            await loadWebhooks();
            showAlert('Вебхук удалён', 'success');
        } catch (error: any) {
            showAlert(error.message || 'Ошибка удаления', 'error');
        }
    }

    async function sendTestWebhook() {
        if (!currentRoomId) {
            showAlert('Нет активной комнаты', 'warning');
            return;
        }

        const testData = {
            message: "Тестовый вебхук",
            time: new Date().toISOString(),
            randomValue: Math.random().toString(36).substring(7),
            nested: {
                level1: {
                    level2: "Глубокое значение",
                    array: [1, 2, 3, 4, 5]
                }
            }
        };

        try {
            await api.webhooks.send(currentRoomId, testData);
            showAlert('Тестовый вебхук отправлен', 'success');
            // Reload to show new webhook
            setTimeout(() => loadWebhooks(), 500);
        } catch (error: any) {
            showAlert(error.message || 'Ошибка отправки', 'error');
        }
    }

    function exportWebhooks() {
        if (webhooks.length === 0) {
            showAlert('Нет данных для экспорта на текущей странице', 'warning');
            return;
        }

        const dataStr = JSON.stringify(webhooks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `webhooks_${currentRoomId}_page${serverPage}_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showAlert('Экспорт завершён', 'success');
    }

    async function copyWebhookUrl() {
        if (!webhookUrl || !browser) return;

        try {
            await navigator.clipboard.writeText(webhookUrl);
            copied = true;
            setTimeout(() => copied = false, 2000);
        } catch {
            showAlert('Не удалось скопировать URL', 'error');
        }
    }

    async function loadFakeErrorStatus() {
        if (!currentRoomId) return;

        try {
            const data = await api.rooms.getFakeErrorStatus(currentRoomId);
            fakeErrorEnabled = data.enabled || data.fakeError || false;
            fakeStatusCode = data.statusCode || data.status || 500;
        } catch (err) {
            console.warn('Failed to load fake error status', err);
        }
    }

    async function toggleFakeError() {
        if (!currentRoomId) {
            fakeErrorEnabled = false;
            showAlert('Сначала создайте комнату', 'warning');
            return;
        }

        try {
            await api.rooms.setFakeError(currentRoomId, fakeErrorEnabled, fakeStatusCode);
            showAlert(
                fakeErrorEnabled ? `Симуляция ${fakeStatusCode} включена` : 'Симуляция отключена',
                'success'
            );
        } catch (error: any) {
            fakeErrorEnabled = !fakeErrorEnabled;
            showAlert('Ошибка при изменении состояния', 'error');
        }
    }

    async function updateFakeErrorStatus() {
        if (!currentRoomId) return;

        try {
            await api.rooms.setFakeError(currentRoomId, fakeErrorEnabled, fakeStatusCode);
        } catch (err) {
            console.error('Update fake error failed', err);
        }
    }

    async function forwardWebhook(payload: any) {
        if (!forwardEnabled || !forwardEndpoint) return;

        try {
            await api.webhooks.forward(forwardEndpoint, payload);
        } catch (error: any) {
            console.error('Forward error:', error);
            showAlert(`Ошибка пересылки: ${error.message}`, 'error');
        }
    }

    function toggleForward() {
        if (forwardEnabled && !forwardEndpoint.trim()) {
            showAlert('Введите URL для пересылки', 'warning');
            forwardEnabled = false;
        } else {
            showAlert(
                forwardEnabled ? 'Пересылка вебхуков включена' : 'Пересылка вебхуков отключена',
                'success'
            );
        }
    }

    async function openWebhookDetails(receiptId: string) {
        if (!currentRoomId) return;

        try {
            const webhook = await api.webhooks.getDetails(currentRoomId, receiptId);
            selectedWebhook = webhook;
            isModalOpen = true;
        } catch (error: any) {
            showAlert('Ошибка загрузки деталей вебхука', 'error');
        }
    }

    function closeModal() {
        isModalOpen = false;
        selectedWebhook = null;
    }

    function handleRoomSelect(roomId: string) {
        roomIdInput = roomId;
        createOrJoinRoom();
    }

    function handlePageChange(page: number) {
        serverPage = page;
        loadWebhooks();
    }

    function handleLimitChange(newLimit: number) {
        serverLimit = newLimit;
        serverPage = 1;
        loadWebhooks();
    }

    // Derived values
    let totalCount = $derived(serverTotal);
    let displayedCount = $derived(webhooks.length);
    let currentPage = $derived(serverPage);
    let totalPages = $derived(serverTotalPages);
</script>

<svelte:head>
    <title>Webhook Viewer - Главная</title>
</svelte:head>

<div class="flex-1 flex max-w-7xl mx-auto w-full">
    <aside class="w-80 bg-white shadow-lg border-r border-gray-200 p-6 space-y-6 overflow-y-auto">
        <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span class="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-green-600">
                    <Home size={16} />
                </span>
                Управление комнатой
            </h2>

            <ConnectionStatus {isOnline} {reconnectAttempts} />

            <div class="space-y-3">
                <input
                        bind:value={roomIdInput}
                        type="text"
                        placeholder="Введите ID комнаты"
                        disabled={loading}
                        class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:bg-gray-50"
                        onkeydown={(e) => e.key === 'Enter' && createOrJoinRoom()}
                />
                <button
                        onclick={createOrJoinRoom}
                        disabled={loading}
                        class="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-lg font-medium transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Загрузка...' : 'Создать / Войти'}
                </button>
                <button
                        onclick={closeRoom}
                        disabled={!currentRoomId}
                        class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Закрыть комнату
                </button>
                <button
                        onclick={() => isRoomsPanelOpen = true}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
                >
                    <Folder size={16} />
                    <span>Показать комнаты</span>
                </button>
            </div>

            {#if currentRoomId}
                <div class="mt-3 text-sm p-3 bg-gray-50 rounded-lg">
                    <div class="font-semibold text-green-700 mb-2 flex items-center gap-2">
                        <Check size={16} />
                        <span>Комната активна</span>
                    </div>
                    <div class="text-xs break-all bg-white p-2 rounded border border-gray-200 group relative">
                        <div class="flex items-center justify-between gap-2">
                            <span class="flex-1">{webhookUrl}</span>
                            <button
                                    onclick={copyWebhookUrl}
                                    class="text-blue-600 hover:text-blue-800 transition"
                                    title="Копировать URL"
                            >
                                {#if copied}
                                    <Check size={16} />
                                {:else}
                                    <Copy size={16} />
                                {/if}
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <h3 class="text-sm font-semibold text-blue-900 mb-2">Статистика</h3>
            <div class="space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-blue-700">Всего вебхуков:</span>
                    <span class="font-bold text-blue-900">{totalCount}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-blue-700">На странице:</span>
                    <span class="font-bold text-blue-900">{displayedCount}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-blue-700">Страница:</span>
                    <span class="font-bold text-blue-900">{currentPage} / {totalPages}</span>
                </div>
            </div>
        </div>

        <div class="border border-gray-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} class="text-yellow-600" />
                <span>Симуляция ошибок</span>
            </h3>
            <label class="flex items-center gap-2 mb-3">
                <input
                        type="checkbox"
                        bind:checked={fakeErrorEnabled}
                        onchange={toggleFakeError}
                        class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span class="text-sm text-gray-700">Включить симуляцию</span>
            </label>
            <input
                    bind:value={fakeStatusCode}
                    onchange={updateFakeErrorStatus}
                    type="number"
                    min="100"
                    max="599"
                    placeholder="HTTP код"
                    disabled={!fakeErrorEnabled}
                    class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50"
            />
        </div>

        <div class="border border-gray-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowRightCircle size={16} class="text-purple-600" />
                <span>Пересылка вебхуков</span>
            </h3>
            <label class="flex items-center gap-2 mb-3">
                <input
                        type="checkbox"
                        bind:checked={forwardEnabled}
                        onchange={toggleForward}
                        class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span class="text-sm text-gray-700">Включить пересылку</span>
            </label>
            <input
                    bind:value={forwardEndpoint}
                    type="text"
                    placeholder="https://example.com/webhook"
                    disabled={!forwardEnabled}
                    class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50"
            />
            <p class="text-xs text-gray-500 mt-2">Вебхуки будут автоматически отправляться на указанный URL</p>
        </div>

        <div class="space-y-2">
            <button
                    onclick={sendTestWebhook}
                    disabled={!currentRoomId}
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send size={16} />
                <span>Отправить тест</span>
            </button>
            <button
                    onclick={exportWebhooks}
                    disabled={webhooks.length === 0}
                    class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download size={16} />
                <span>Экспорт страницы</span>
            </button>
            <button
                    onclick={clearAllWebhooks}
                    disabled={!currentRoomId}
                    class="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Trash2 size={16} />
                <span>Очистить все</span>
            </button>
        </div>
    </aside>

    <main class="flex-1 p-6 overflow-y-auto">
        <div class="bg-white p-4 rounded-lg shadow-md mb-6">
            <div class="flex gap-3 items-center justify-between">
                <div class="flex items-center gap-2 text-sm text-gray-600">
                    <Database size={16} />
                    <span>Серверная пагинация активна</span>
                </div>
                <select
                        value={serverLimit}
                        onchange={(e) => handleLimitChange(Number(e.currentTarget.value))}
                        class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                    <option value={10}>10 / страница</option>
                    <option value={25}>25 / страница</option>
                    <option value={50}>50 / страница</option>
                    <option value={100}>100 / страница</option>
                </select>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-gray-900">История вебхуков</h2>

                    <!-- Compact Pagination -->
                    {#if webhooks.length > 0 && totalPages > 1}
                        <div class="flex items-center gap-2">
                            <button
                                    onclick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    class="p-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                    title="Предыдущая"
                            >
                                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>

                            <div class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-300">
                                <span class="text-sm font-semibold text-green-600">{currentPage}</span>
                                <span class="text-xs text-gray-400">/</span>
                                <span class="text-sm text-gray-600">{totalPages}</span>
                            </div>

                            <button
                                    onclick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    class="p-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                    title="Следующая"
                            >
                                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="p-4 space-y-4 min-h-[400px]">
                {#if webhooksLoading && webhooks.length === 0}
                    <div class="flex flex-col items-center justify-center py-16 text-gray-400">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                        <p class="text-lg">Загрузка вебхуков...</p>
                    </div>
                {:else if webhooks.length === 0}
                    <div class="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Database size={64} class="mb-4 text-gray-300" />
                        <p class="text-lg">Нет вебхуков для отображения</p>
                        <p class="text-sm mt-2">Создайте комнату и отправьте первый вебхук</p>
                    </div>
                {:else}
                    {#each webhooks as webhook (webhook.receiptId)}
                        <WebhookCard
                                {webhook}
                                onDelete={() => deleteWebhook(webhook.receiptId)}
                                onDetails={() => openWebhookDetails(webhook.receiptId)}
                        />
                    {/each}
                {/if}
            </div>
        </div>

        {#if webhooks.length > 0 && totalPages > 1}
            <div class="mt-6">
                <Pagination
                        {currentPage}
                        {totalPages}
                        onPageChange={handlePageChange}
                />
            </div>
        {/if}
    </main>
</div>

<RoomsPanel
        isOpen={isRoomsPanelOpen}
        onClose={() => isRoomsPanelOpen = false}
        onRoomSelect={handleRoomSelect}
/>

<WebhookModal
        webhook={selectedWebhook}
        isOpen={isModalOpen}
        onClose={closeModal}
/>

<footer class="bg-white border-t border-gray-200 mt-auto">
    <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between text-sm text-gray-600">
            <div class="flex items-center gap-2">
                <span class="text-green-600 font-semibold">GREEN-API QA TEAM</span>
                <span class="text-gray-400">|</span>
                <p>© 2025 Webhook Viewer</p>
            </div>
            <div class="flex gap-6">
                <a href="/docs" class="hover:text-green-600 transition">Документация</a>
            </div>
        </div>
    </div>
</footer>
