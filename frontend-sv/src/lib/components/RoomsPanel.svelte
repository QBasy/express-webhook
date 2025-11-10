<script lang="ts">
    import { X, Folder, LogIn, Database, ChevronLeft, ChevronRight } from 'lucide-svelte';
    import { api } from '$lib/api';
    import { showAlert } from '$lib/stores';

    let {
        isOpen,
        onClose,
        onRoomSelect
    }: {
        isOpen: boolean;
        onClose: () => void;
        onRoomSelect: (roomId: string) => void;
    } = $props();

    let rooms = $state<any[]>([]);
    let loading = $state(false);
    let error = $state(false);
    let currentPage = $state(1);
    let totalPages = $state(1);
    let total = $state(0);
    const limit = 10;

    async function loadRooms(page: number = 1) {
        loading = true;
        error = false;

        try {
            const data = await api.rooms.getAllRooms(page, limit);
            rooms = data.rooms || [];
            total = data.total || 0;
            currentPage = data.page || 1;
            totalPages = data.totalPages || 1;
        } catch (err) {
            error = true;
            showAlert('Ошибка загрузки комнат', 'error');
        } finally {
            loading = false;
        }
    }

    function handleRoomSelect(roomId: string) {
        onRoomSelect(roomId);
        onClose();
    }

    function goToPage(page: number) {
        if (page < 1 || page > totalPages) return;
        loadRooms(page);
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }

    $effect(() => {
        if (isOpen) {
            loadRooms(1);
        }
    });
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
            class="fixed inset-0 bg-opacity-50 z-[100]"
            onclick={handleBackdropClick}
            role="button"
            tabindex="-1"
    ></div>

    <!-- Panel -->
    <div class="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-[101] flex flex-col animate-slide-in">
        <!-- Header -->
        <div class="p-4 flex items-center justify-between border-b border-gray-200 bg-white">
            <h3 class="text-lg font-semibold flex items-center gap-2">
                <Folder size={20} class="text-green-600" />
                <span>Все комнаты</span>
            </h3>
            <button
                    onclick={onClose}
                    class="text-gray-500 hover:text-gray-700 transition p-1 hover:bg-gray-100 rounded"
            >
                <X size={20} />
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 bg-white">
            {#if loading}
                <div class="flex items-center justify-center py-12">
                    <div class="flex flex-col items-center gap-3">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                        <p class="text-sm text-gray-500">Загрузка комнат...</p>
                    </div>
                </div>
            {:else if error}
                <div class="text-center py-8">
                    <div class="text-red-500 mb-4">
                        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="font-semibold">Ошибка загрузки</p>
                    </div>
                    <button
                            onclick={() => loadRooms(currentPage)}
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                    >
                        Попробовать снова
                    </button>
                </div>
            {:else if rooms.length === 0}
                <div class="text-center text-gray-500 py-12">
                    <Database size={64} class="mx-auto mb-3 text-gray-300" />
                    <p class="font-medium">Нет доступных комнат</p>
                    <p class="text-sm mt-1">Создайте первую комнату</p>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each rooms as room}
                        <div class="p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-green-300 transition bg-white">
                            <div class="flex items-start justify-between mb-3">
                                <button
                                        onclick={() => handleRoomSelect(room.roomId)}
                                        class="text-left font-semibold text-gray-800 hover:text-green-600 transition flex-1 text-base"
                                >
                                    {room.roomId}
                                </button>
                            </div>

                            <div class="flex items-center justify-between">
                                <div class="text-sm text-gray-500 flex items-center gap-1.5">
                                    <Database size={14} />
                                    <span>Вебхуков: <strong>{room.webhooksCount || 0}</strong></span>
                                </div>

                                <button
                                        onclick={() => handleRoomSelect(room.roomId)}
                                        class="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1.5 shadow-sm hover:shadow-md"
                                >
                                    <LogIn size={14} />
                                    <span>Открыть</span>
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Pagination -->
        {#if !loading && !error && rooms.length > 0}
            <div class="border-t border-gray-200 p-4 bg-gray-50">
                <div class="flex items-center justify-between">
                    <button
                            onclick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                    >
                        <ChevronLeft size={16} />
                        <span>Назад</span>
                    </button>

                    <div class="text-sm text-gray-700">
                        <span class="font-bold text-green-600">{currentPage}</span>
                        <span class="text-gray-500">из</span>
                        <span class="font-bold">{totalPages}</span>
                        <div class="text-xs text-gray-500 mt-0.5">Всего: {total}</div>
                    </div>

                    <button
                            onclick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                    >
                        <span>Вперед</span>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    @keyframes slide-in {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }

    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
</style>
