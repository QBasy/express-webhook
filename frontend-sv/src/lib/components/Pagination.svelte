<script lang="ts">
    import { ChevronLeft, ChevronRight } from 'lucide-svelte';

    let {
        currentPage,
        totalPages,
        onPageChange
    }: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    } = $props();

    function getPages(): (number | string)[] {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        } else if (currentPage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    let pages = $derived(getPages());

    function handlePrevious() {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    }

    function handleNext() {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    }

    function handlePageClick(page: number | string) {
        if (typeof page === 'number') {
            onPageChange(page);
        }
    }
</script>

<div class="flex items-center justify-between bg-white p-4 rounded-lg shadow-md">
    <button
            onclick={handlePrevious}
            disabled={currentPage === 1}
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
        <ChevronLeft size={16} />
        <span>Назад</span>
    </button>

    <div class="flex gap-2">
        {#each pages as page}
            {#if page === '...'}
                <span class="px-3 py-2 text-gray-400">...</span>
            {:else}
                <button
                        onclick={() => handlePageClick(page)}
                        class="px-3 py-2 rounded-lg font-medium transition {page === currentPage ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                >
                    {page}
                </button>
            {/if}
        {/each}
    </div>

    <button
            onclick={handleNext}
            disabled={currentPage === totalPages || totalPages === 0}
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
        <span>Вперед</span>
        <ChevronRight size={16} />
    </button>
</div>
