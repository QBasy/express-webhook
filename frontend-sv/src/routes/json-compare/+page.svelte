<script lang="ts">
    import { GitCompare, Copy, Trash2, Check } from 'lucide-svelte';
    import { showAlert } from '$lib/stores';

    let json1 = $state('');
    let json2 = $state('');
    let result = $state('');
    let differences = $state<any[]>([]);
    let copied = $state(false);

    function compareJSON() {
        try {
            const obj1 = JSON.parse(json1);
            const obj2 = JSON.parse(json2);

            const diffs = findDifferences(obj1, obj2);
            differences = diffs;

            if (diffs.length === 0) {
                result = 'JSON объекты идентичны! ✅';
                showAlert('JSON объекты идентичны', 'success');
            } else {
                result = `Найдено ${diffs.length} различий`;
                showAlert(`Найдено ${diffs.length} различий`, 'warning');
            }
        } catch (error: any) {
            showAlert('Ошибка парсинга JSON: ' + error.message, 'error');
            result = 'Ошибка парсинга JSON';
            differences = [];
        }
    }

    function findDifferences(obj1: any, obj2: any, path = ''): any[] {
        const diffs: any[] = [];

        const allKeys = new Set([
            ...Object.keys(obj1 || {}),
            ...Object.keys(obj2 || {})
        ]);

        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const val1 = obj1?.[key];
            const val2 = obj2?.[key];

            if (!(key in obj1)) {
                diffs.push({
                    path: currentPath,
                    type: 'added',
                    value2: val2
                });
            } else if (!(key in obj2)) {
                diffs.push({
                    path: currentPath,
                    type: 'removed',
                    value1: val1
                });
            } else if (typeof val1 !== typeof val2) {
                diffs.push({
                    path: currentPath,
                    type: 'type_changed',
                    value1: val1,
                    value2: val2
                });
            } else if (typeof val1 === 'object' && val1 !== null) {
                if (Array.isArray(val1) && Array.isArray(val2)) {
                    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                        diffs.push({
                            path: currentPath,
                            type: 'modified',
                            value1: val1,
                            value2: val2
                        });
                    }
                } else {
                    diffs.push(...findDifferences(val1, val2, currentPath));
                }
            } else if (val1 !== val2) {
                diffs.push({
                    path: currentPath,
                    type: 'modified',
                    value1: val1,
                    value2: val2
                });
            }
        }

        return diffs;
    }

    function formatJSON(input: string) {
        try {
            const parsed = JSON.parse(input);
            return JSON.stringify(parsed, null, 2);
        } catch {
            showAlert('Некорректный JSON', 'error');
            return input;
        }
    }

    function format1() {
        json1 = formatJSON(json1);
    }

    function format2() {
        json2 = formatJSON(json2);
    }

    function clear() {
        json1 = '';
        json2 = '';
        result = '';
        differences = [];
    }

    async function copyResult() {
        if (!differences.length) return;

        try {
            await navigator.clipboard.writeText(JSON.stringify(differences, null, 2));
            copied = true;
            setTimeout(() => copied = false, 2000);
        } catch {
            showAlert('Не удалось скопировать результат', 'error');
        }
    }

    function getDiffColor(type: string) {
        switch (type) {
            case 'added': return 'bg-green-50 border-green-300';
            case 'removed': return 'bg-red-50 border-red-300';
            case 'modified': return 'bg-yellow-50 border-yellow-300';
            case 'type_changed': return 'bg-orange-50 border-orange-300';
            default: return 'bg-gray-50 border-gray-300';
        }
    }

    function getDiffIcon(type: string) {
        switch (type) {
            case 'added': return '➕';
            case 'removed': return '➖';
            case 'modified': return '✏️';
            case 'type_changed': return '🔄';
            default: return '•';
        }
    }

    function getDiffLabel(type: string) {
        switch (type) {
            case 'added': return 'Добавлено';
            case 'removed': return 'Удалено';
            case 'modified': return 'Изменено';
            case 'type_changed': return 'Тип изменен';
            default: return 'Изменение';
        }
    }
</script>

<svelte:head>
    <title>JSON Compare - Webhook Viewer</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <GitCompare size={32} class="text-purple-600" />
            <span>Сравнение JSON</span>
        </h1>
        <p class="text-gray-600 mt-2">Сравните два JSON объекта и найдите различия</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-gray-800">JSON 1</h2>
                <button
                        onclick={format1}
                        class="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                    Форматировать
                </button>
            </div>
            <textarea
                    bind:value={json1}
                    rows={16}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 font-mono text-sm"
                    placeholder='{"\"key\": \"value\""}'
            ></textarea>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-gray-800">JSON 2</h2>
                <button
                        onclick={format2}
                        class="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                    Форматировать
                </button>
            </div>
            <textarea
                    bind:value={json2}
                    rows={16}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 font-mono text-sm"
                    placeholder='{"\"key\": \"value\""}'
            ></textarea>
        </div>
    </div>

    <div class="flex gap-4 mb-6">
        <button
                onclick={compareJSON}
                class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        >
            <GitCompare size={20} />
            <span>Сравнить</span>
        </button>
        <button
                onclick={clear}
                class="px-6 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        >
            <Trash2 size={20} />
            <span>Очистить</span>
        </button>
    </div>

    {#if result}
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-gray-800">Результат</h2>
                {#if differences.length > 0}
                    <button
                            onclick={copyResult}
                            class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
                    >
                        {#if copied}
                            <Check size={16} />
                            <span>Скопировано</span>
                        {:else}
                            <Copy size={16} />
                            <span>Копировать</span>
                        {/if}
                    </button>
                {/if}
            </div>

            <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p class="text-lg font-medium text-gray-800">{result}</p>
            </div>

            {#if differences.length > 0}
                <div class="space-y-3">
                    {#each differences as diff, i (i)}
                        <div class="border rounded-lg p-4 {getDiffColor(diff.type)}">
                            <div class="flex items-start gap-3">
                                <span class="text-2xl">{getDiffIcon(diff.type)}</span>
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="text-sm font-semibold text-gray-700">{getDiffLabel(diff.type)}</span>
                                        <span class="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-300">{diff.path}</span>
                                    </div>

                                    {#if diff.type === 'added'}
                                        <div class="mt-2">
                                            <p class="text-xs text-gray-600 mb-1">Значение:</p>
                                            <pre class="text-sm bg-white p-2 rounded border border-green-300 overflow-x-auto">{JSON.stringify(diff.value2, null, 2)}</pre>
                                        </div>
                                    {:else if diff.type === 'removed'}
                                        <div class="mt-2">
                                            <p class="text-xs text-gray-600 mb-1">Было:</p>
                                            <pre class="text-sm bg-white p-2 rounded border border-red-300 overflow-x-auto">{JSON.stringify(diff.value1, null, 2)}</pre>
                                        </div>
                                    {:else}
                                        <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <p class="text-xs text-gray-600 mb-1">Было:</p>
                                                <pre class="text-sm bg-white p-2 rounded border border-gray-300 overflow-x-auto">{JSON.stringify(diff.value1, null, 2)}</pre>
                                            </div>
                                            <div>
                                                <p class="text-xs text-gray-600 mb-1">Стало:</p>
                                                <pre class="text-sm bg-white p-2 rounded border border-gray-300 overflow-x-auto">{JSON.stringify(diff.value2, null, 2)}</pre>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
