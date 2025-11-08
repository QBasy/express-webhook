<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { fetchWithAuth } from '$stores/auth';
    import {
        CheckCircle, RefreshCw, Send, Download, Trash2,
        Search, Inbox, ChevronLeft, ChevronRight, Copy,
        AlertCircle, Info, X
    } from 'lucide-svelte';
    import WebhookCard from '$components/WebhookCard.svelte';
    import WebhookModal from '$components/WebhookModal.svelte';
    import Alert from './Alert.svelte';

    // State
    let currentRoomId: string | null = null;
    let roomIdInput = '';
    let allHooks: any[] = [];
    let lastIds = new Set<string>();

    // Polling
    let hookInterval: any = null;
    let isOnline = true;
    let reconnectAttempts = 0;

    // Pagination & Search
    let searchTerm = '';
    let currentPage = 1;
    let itemsPerPage = 25;
    let sortOrder: 'newest' | 'oldest' = 'newest';

    // Fake Error
    let fakeErrorEnabled = false;
    let fakeStatusCode = 500;

    // Forward
    let forwardEnabled = false;
    let forwardEndpoint = '';

    // Modal
    let selectedWebhook: any = null;
    let showModal = false;

    // Alert
    let alertVisible = false;
    let alertMessage = '';
    let alertType: 'success' | 'error' | 'warning' = 'success';

    // Computed
    $: webhookUrl = currentRoomId ? `${window.location.origin}/hook/${encodeURIComponent(currentRoomId)}` : '';

    $: filteredHooks = allHooks.filter(hook => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const bodyStr = JSON.stringify(hook.body || {}).toLowerCase();
        return bodyStr.includes(searchLower) || hook.receiptId.toLowerCase().includes(searchLower);
    });

    $: sortedHooks = [...filteredHooks].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    $: totalPages = Math.ceil(sortedHooks.length / itemsPerPage);
    $: paginatedHooks = sortedHooks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Functions
    function showAlert(message: string, type: 'success' | 'error' | 'warning') {
        alertMessage = message;
        alertType = type;
        alertVisible = true;

        if (type !== 'success') {
            setTimeout(() => { alertVisible = false; }, 5000);
        }
    }

    async function createRoom() {
        const id = roomIdInput.trim();
        if (!id) {
            showAlert('Введите ID комнаты', 'warning');
            return;
        }

        try {
            currentRoomId = id;
            lastIds.clear();
            allHooks = [];
            currentPage = 1;

            const res = await fetchWithAuth(`/room/${encodeURIComponent(id)}`, { method: 'POST' });
            if (!res.ok) throw new Error('Ошибка создания комнаты');

            await updateFakeErrorStatus();
            startFetchingHooks();
            updateConnectionStatus(true);
            showAlert('Комната создана успешно', 'success');
        } catch (e: any) {
            showAlert('Ошибка: ' + e.message, 'error');
            updateConnectionStatus(false);
        }
    }

    async function closeRoom() {
        if (!currentRoomId) {
            showAlert('Нет активной комнаты', 'warning');
            return;
        }

        try {
            await fetchWithAuth(`/room/${encodeURIComponent(currentRoomId)}`, { method: 'DELETE' });
            stopFetchingHooks();
            currentRoomId = null;
            lastIds.clear();
            allHooks = [];
            currentPage = 1;
            fakeErrorEnabled = false;
            fakeStatusCode = 500;
            showAlert('Комната закрыта', 'success');
        } catch (e) {
            showAlert('Ошибка закрытия комнаты', 'error');
        }
    }

    async function clearHooks() {
        if (!currentRoomId) {
            showAlert('Нет активной комнаты', 'warning');
            return;
        }

        try {
            await fetchWithAuth(`/hook/delete/${encodeURIComponent(currentRoomId)}`, { method: 'DELETE' });
            lastIds.clear();
            allHooks = [];
            currentPage = 1;
            showAlert('Вебхуки очищены', 'success');
        } catch (e) {
            showAlert('Ошибка очистки', 'error');
        }
    }

    async function sendTestHook() {
        if (!currentRoomId) {
            showAlert('Нет активной комнаты', 'warning');
            return;
        }

        const testData = {
            message: 'Тестовый вебхук',
            time: new Date().toISOString(),
            randomValue: Math.random().toString(36).substring(7),
            nested: {
                level1: {
                    level2: 'Глубокое значение',
                    array: [1, 2, 3, 4, 5]
                }
            }
        };

        try {
            const res = await fetchWithAuth(`/hook/${encodeURIComponent(currentRoomId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => null);
                throw new Error(errBody?.error || res.status);
            }
            showAlert('Тестовый вебхук отправлен', 'success');
        } catch (e: any) {
            showAlert('Ошибка отправки: ' + e.message, 'error');
            updateConnectionStatus(false);
        }
    }

    function exportHooks() {
        if (allHooks.length === 0) {
            showAlert('Нет данных для экспорта', 'warning');
            return;
        }

        const dataStr = JSON.stringify(allHooks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `webhooks_${currentRoomId || 'no-room'}_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showAlert('Экспорт завершён', 'success');
    }

    async function toggleFakeError() {
        if (!currentRoomId) {
            fakeErrorEnabled = false;
            showAlert('Сначала создайте комнату', 'warning');
            return;
        }

        try {
            const res = await fetchWithAuth(`/room/${encodeURIComponent(currentRoomId)}/fake-error`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: fakeErrorEnabled,
                    statusCode: fakeStatusCode
                })
            });

            if (!res.ok) throw new Error('Не удалось обновить статус');

            showAlert(
                fakeErrorEnabled ? `Симуляция ${fakeStatusCode} включена` : 'Симуляция отключена',
                'success'
            );
        } catch (err) {
            fakeErrorEnabled = !fakeErrorEnabled;
            showAlert('Ошибка при изменении состояния', 'error');
            updateConnectionStatus(false);
        }
    }

    async function updateFakeErrorStatus() {
        if (!currentRoomId) return;

        try {
            const res = await fetchWithAuth(`/room/${encodeURIComponent(currentRoomId)}/fake-error`);
            if (!res.ok) {
                fakeErrorEnabled = false;
                return;
            }
            const data = await res.json();
            fakeErrorEnabled = Boolean(data.fakeError ?? data.enabled ?? false);
            fakeStatusCode = data.statusCode ?? data.status ?? 500;
        } catch (err) {
            console.warn('updateFakeErrorStatus failed', err);
        }
    }

    function startFetchingHooks() {
        if (hookInterval) clearInterval(hookInterval);
        fetchHooks(); // сразу
        hookInterval = setInterval(fetchHooks, 2000); // каждые 2 сек
    }

    function stopFetchingHooks() {
        if (hookInterval) {
            clearInterval(hookInterval);
            hookInterval = null;
        }
    }

    async function fetchHooks() {
        if (!currentRoomId) return;

        try {
            const res = await fetchWithAuth(`/hook/all/${encodeURIComponent(currentRoomId)}`);
            if (!res.ok) throw new Error('Failed to fetch');

            const data = await res.json();
            const newHooks = data.filter((hook: any) => !lastIds.has(hook.receiptId));

            if (newHooks.length > 0) {
                newHooks.forEach((hook: any) => {
                    lastIds.add(hook.receiptId);
                    allHooks = [hook, ...allHooks]; // новые вверху

                    // Forward if enabled
                    if (forwardEnabled && forwardEndpoint) {
                        forwardWebhook(hook);
                    }
                });
            }

            updateConnectionStatus(true);
        } catch (e) {
            console.error('Fetch error:', e);
            updateConnectionStatus(false);
        }
    }

    async function forwardWebhook(webhookBody: any) {
        if (!forwardEnabled || !forwardEndpoint) return;

        try {
            const response = await fetch(forwardEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookBody)
            });

            if (!response.ok) {
                console.error('Forward failed:', response.status);
                showAlert(`Ошибка пересылки: ${response.status}`, 'error');
            }
        } catch (error: any) {
            console.error('Forward error:', error);
            showAlert(`Ошибка пересылки: ${error.message}`, 'error');
        }
    }

    function updateConnectionStatus(online: boolean) {
        isOnline = online;
        if (online) {
            reconnectAttempts = 0;
        } else {
            attemptReconnect();
        }
    }

    async function attemptReconnect() {
        if (isOnline || !currentRoomId) return;

        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

        setTimeout(async () => {
            try {
                const res = await fetchWithAuth(`/hook/all/${encodeURIComponent(currentRoomId!)}`);
                if (res.ok) {
                    updateConnectionStatus(true);
                    showAlert('Соединение восстановлено', 'success');
                } else {
                    attemptReconnect();
                }
            } catch {
                attemptReconnect();
            }
        }, delay);
    }

    function copyUrl() {
        if (!webhookUrl) return;
        navigator.clipboard.writeText(webhookUrl).then(() => {
            showAlert('URL скопирован', 'success');
        });
    }

    function openWebhookDetails(webhook: any) {
        selectedWebhook = webhook;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedWebhook = null;
    }

    function changePage(page: number) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }

    onMount(() => {
        // Можно загрузить последнюю комнату из localStorage если нужно
    });

    onDestroy(() => {
        stopFetchingHooks();
    });
</script>


<div class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex flex-col">
    <!-- Main Container -->
    <div class="flex flex-1">
        <!-- Sidebar -->
        <aside class="w-80 bg-white border-r border-gray-200 p-6 space-y-6 overflow-y-auto">
            <!-- Connection Status -->
            {#if currentRoomId}
                <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-3 {isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    <span class="w-2 h-2 rounded-full {isOnline ? 'bg-green-500 pulse-dot' : 'bg-red-500'}"></span>
                    <span>{isOnline ? 'Подключено' : reconnectAttempts > 0 ? `Переподключение... (${reconnectAttempts})` : 'Нет соединения'}</span>
                </div>
            {/if}

            <!-- Alert -->
            {#if alertVisible}
                <Alert type={alertType} message={alertMessage} visible={alertVisible} />
            {/if}

            <!-- Room Control -->
            <div class="border border-gray-200 rounded-lg p-4">
                <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle size={16} class="text-green-600" />
                    <span>Управление комнатой</span>
                </h3>
                <input
                        type="text"
                        bind:value={roomIdInput}
                        placeholder="ID комнаты"
                        class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                />
                <div class="space-y-2">
                    {#if !currentRoomId}
                        <button
                                on:click={createRoom}
                                class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={16} />
                            <span>Создать комнату</span>
                        </button>
                    {:else}
                        <button
                                on:click={closeRoom}
                                class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
                        >
                            <X size={16} />
                            <span>Закрыть комнату</span>
                        </button>
                    {/if}
                </div>

                {#if currentRoomId}
                    <div class="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs break-all">
                        <div class="flex items-center justify-between gap-2">
                            <span class="flex-1 text-green-800">{webhookUrl}</span>
                            <button
                                    on:click={copyUrl}
                                    class="text-green-600 hover:text-green-800"
                                    title="Копировать URL"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Fake Error -->
            <div class="border border-gray-200 rounded-lg p-4">
                <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle size={16} class="text-orange-600" />
                    <span>Симуляция ошибки</span>
                </h3>
                <label class="flex items-center gap-2 mb-3">
                    <input
                            type="checkbox"
                            bind:checked={fakeErrorEnabled}
                            on:change={toggleFakeError}
                            disabled={!currentRoomId}
                            class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span class="text-sm text-gray-700">Включить</span>
                </label>
                <input
                        type="number"
                        bind:value={fakeStatusCode}
                        disabled={!fakeErrorEnabled}
                        min="100"
                        max="599"
                        placeholder="Код ошибки (500)"
                        class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                />
            </div>

            <!-- Forward Settings -->
            <div class="border border-gray-200 rounded-lg p-4">
                <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Send size={16} class="text-purple-600" />
                    <span>Пересылка</span>
                </h3>
                <label class="flex items-center gap-2 mb-3">
                    <input
                            type="checkbox"
                            bind:checked={forwardEnabled}
                            class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span class="text-sm text-gray-700">Включить пересылку</span>
                </label>
                <input
                        bind:value={forwardEndpoint}
                        type="text"
                        placeholder="https://example.com/webhook"
                        disabled={!forwardEnabled}
                        class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                />
                <p class="text-xs text-gray-500 mt-2">Вебхуки будут автоматически отправляться на указанный URL</p>
            </div>

            <!-- Sorting -->
            <div class="border border-gray-200 rounded-lg p-4">
                <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <RefreshCw size={16} class="text-blue-600" />
                    <span>Сортировка</span>
                </h3>
                <select
                        bind:value={sortOrder}
                        class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                    <option value="newest">Новые первые</option>
                    <option value="oldest">Старые первые</option>
                </select>
            </div>

            <!-- Actions -->
            <div class="space-y-2">
                <button
                        on:click={sendTestHook}
                        disabled={!currentRoomId}
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                    <span>Отправить тест</span>
                </button>
                <button
                        on:click={exportHooks}
                        disabled={allHooks.length === 0}
                        class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={16} />
                    <span>Экспорт JSON</span>
                </button>
                <button
                        on:click={clearHooks}
                        disabled={!currentRoomId}
                        class="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trash2 size={16} />
                    <span>Очистить все</span>
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 p-6 overflow-y-auto">
            <!-- Search & Filters -->
            <div class="bg-white p-4 rounded-lg shadow-md mb-6">
                <div class="flex gap-3 items-center">
                    <div class="flex-1 relative">
                        <input
                                bind:value={searchTerm}
                                type="text"
                                placeholder="Поиск по содержимому вебхука..."
                                class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
							<Search size={20} />
						</span>
                    </div>
                    <select
                            bind:value={itemsPerPage}
                            on:change={() => currentPage = 1}
                            class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                        <option value={10}>10 / страница</option>
                        <option value={25}>25 / страница</option>
                        <option value={50}>50 / страница</option>
                        <option value={100}>100 / страница</option>
                    </select>
                </div>
            </div>

            <!-- Webhooks List -->
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                <div class="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">История вебхуков ({sortedHooks.length})</h2>
                </div>
                <div class="p-4 space-y-4 min-h-[400px]">
                    {#if paginatedHooks.length === 0}
                        <div class="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Inbox size={64} class="mb-4 text-gray-300" />
                            <p class="text-lg">Нет вебхуков для отображения</p>
                            <p class="text-sm mt-2">Создайте комнату и отправьте первый вебхук</p>
                        </div>
                    {:else}
                        {#each paginatedHooks as webhook (webhook.receiptId)}
                            <WebhookCard {webhook} on:click={() => openWebhookDetails(webhook)} />
                        {/each}
                    {/if}
                </div>
            </div>

            <!-- Pagination -->
            {#if totalPages > 1}
                <div class="mt-6 flex items-center justify-between bg-white p-4 rounded-lg shadow-md">
                    <button
                            on:click={() => changePage(currentPage - 1)}
                            disabled={currentPage === 1}
                            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ChevronLeft size={16} />
                        <span>Назад</span>
                    </button>
                    <div class="flex gap-2">
                        {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1) as pageNum}
                            <button
                                    on:click={() => changePage(pageNum)}
                                    class="px-3 py-1 rounded {currentPage === pageNum ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition"
                            >
                                {pageNum}
                            </button>
                        {/each}
                    </div>
                    <button
                            on:click={() => changePage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span>Вперед</span>
                        <ChevronRight size={16} />
                    </button>
                </div>
            {/if}
        </main>
    </div>

    <!-- Footer -->
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
</div>

<!-- Modal -->
{#if showModal && selectedWebhook}
    <WebhookModal webhook={selectedWebhook} on:close={closeModal} />
{/if}

<style>
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .pulse-dot {
        animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
</style>