<script lang="ts">
    import { onMount } from 'svelte';
    import { Scale, Plus, GitCompare, Trash2, Lightbulb, X, FileDiff, GitBranch } from 'lucide-svelte';
    import Alert from '$components/Alert.svelte';

    let jsonInputs: Array<{id: number, content: string}> = [
        { id: 1, content: '' },
        { id: 2, content: '' }
    ];
    let nextId = 3;

    let currentView: 'unified' | 'tree' | 'raw' = 'unified';
    let comparisonResult: any = null;
    let stats = { matches: 0, missing: 0, different: 0, typeErrors: 0 };

    let alertVisible = false;
    let alertMessage = '';
    let alertType: 'success' | 'error' | 'warning' = 'success';

    function showAlert(message: string, type: 'success' | 'error' | 'warning') {
        alertMessage = message;
        alertType = type;
        alertVisible = true;
        setTimeout(() => { alertVisible = false; }, 5000);
    }

    function addJsonInput() {
        jsonInputs = [...jsonInputs, { id: nextId++, content: '' }];
    }

    function removeInput(id: number) {
        if (jsonInputs.length <= 2) {
            showAlert('Минимум 2 JSON для сравнения', 'warning');
            return;
        }
        jsonInputs = jsonInputs.filter(input => input.id !== id);
    }

    function compareAll() {
        const parsed = jsonInputs.map((input, idx) => {
            try {
                return { data: JSON.parse(input.content), idx };
            } catch (e) {
                throw new Error(`Ошибка в JSON #${idx + 1}`);
            }
        });

        if (parsed.length < 2) {
            showAlert('Нужно минимум 2 JSON для сравнения', 'warning');
            return;
        }

        const base = parsed[0].data;
        const comparisons = parsed.slice(1).map(item => compareObjects(base, item.data, ''));

        stats = {
            matches: 0,
            missing: 0,
            different: 0,
            typeErrors: 0
        };

        comparisons.forEach(comp => {
            comp.forEach((diff: any) => {
                if (diff.type === 'match') stats.matches++;
                else if (diff.type === 'missing') stats.missing++;
                else if (diff.type === 'value-mismatch' || diff.type === 'extra') stats.different++;
                else if (diff.type === 'type-mismatch') stats.typeErrors++;
            });
        });

        comparisonResult = { comparisons };
        showAlert('Сравнение завершено', 'success');
    }

    function compareObjects(obj1: any, obj2: any, path: string): any[] {
        const diffs: any[] = [];

        const keys1 = new Set(Object.keys(obj1 || {}));
        const keys2 = new Set(Object.keys(obj2 || {}));
        const allKeys = new Set([...keys1, ...keys2]);

        allKeys.forEach(key => {
            const newPath = path ? `${path}.${key}` : key;
            const val1 = obj1?.[key];
            const val2 = obj2?.[key];

            if (!keys2.has(key)) {
                diffs.push({ type: 'missing', path: newPath, value1: val1, value2: undefined });
            } else if (!keys1.has(key)) {
                diffs.push({ type: 'extra', path: newPath, value1: undefined, value2: val2 });
            } else if (typeof val1 !== typeof val2) {
                diffs.push({ type: 'type-mismatch', path: newPath, value1: val1, value2: val2 });
            } else if (typeof val1 === 'object' && val1 !== null && val2 !== null) {
                diffs.push(...compareObjects(val1, val2, newPath));
            } else if (val1 !== val2) {
                diffs.push({ type: 'value-mismatch', path: newPath, value1: val1, value2: val2 });
            } else {
                diffs.push({ type: 'match', path: newPath, value1: val1, value2: val2 });
            }
        });

        return diffs;
    }

    function clearAll() {
        if (!confirm('Очистить все JSON?')) return;
        jsonInputs = jsonInputs.map(input => ({ ...input, content: '' }));
        comparisonResult = null;
        showAlert('Все поля очищены', 'success');
    }

    function loadExample() {
        const examples = [
            { name: "John Doe", age: 30, email: "john@example.com", active: true, roles: ["user", "admin"] },
            { name: "John Doe", age: "30", email: "john@example.com", status: "active", roles: ["user"] }
        ];

        jsonInputs = jsonInputs.map((input, idx) => ({
            ...input,
            content: examples[idx] ? JSON.stringify(examples[idx], null, 2) : ''
        }));

        showAlert('Пример загружен!', 'success');
    }

    function getDiffClass(type: string): string {
        const classes: Record<string, string> = {
            'match': 'bg-green-50 border-l-4 border-green-500',
            'missing': 'bg-red-50 border-l-4 border-red-500',
            'extra': 'bg-blue-50 border-l-4 border-blue-500',
            'value-mismatch': 'bg-pink-50 border-l-4 border-pink-500',
            'type-mismatch': 'bg-yellow-50 border-l-4 border-yellow-500'
        };
        return classes[type] || '';
    }

    function getDiffColor(type: string): string {
        const colors: Record<string, string> = {
            'match': 'text-green-600',
            'missing': 'text-red-600',
            'extra': 'text-blue-600',
            'value-mismatch': 'text-pink-600',
            'type-mismatch': 'text-yellow-600'
        };
        return colors[type] || 'text-gray-600';
    }
</script>

<svelte:head>
    <title>JSON Compare - Webhook Viewer</title>
</svelte:head>

<div class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                    <Scale size={32} class="text-white" />
                </div>
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">JSON Compare</h1>
                    <p class="text-gray-600">Сравнение и визуализация различий в JSON объектах</p>
                </div>
            </div>

            <!-- Legend -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg flex items-center gap-2">
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span class="text-sm font-medium text-gray-700">Совпадает</span>
                </div>
                <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-center gap-2">
                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span class="text-sm font-medium text-gray-700">Отсутствует</span>
                </div>
                <div class="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg flex items-center gap-2">
                    <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span class="text-sm font-medium text-gray-700">Лишнее</span>
                </div>
                <div class="bg-pink-50 border-l-4 border-pink-500 p-3 rounded-lg flex items-center gap-2">
                    <div class="w-3 h-3 bg-pink-500 rounded-full"></div>
                    <span class="text-sm font-medium text-gray-700">Не совпадает</span>
                </div>
                <div class="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg flex items-center gap-2">
                    <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span class="text-sm font-medium text-gray-700">Разные типы</span>
                </div>
            </div>
        </div>

        <!-- Alert -->
        {#if alertVisible}
            <div class="mb-6">
                <Alert message={alertMessage} type={alertType} visible={alertVisible} />
            </div>
        {/if}

        <!-- Controls -->
        <div class="mb-6 flex flex-wrap gap-4">
            <button on:click={addJsonInput} class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-2">
                <Plus size={20} />
                <span>Добавить JSON</span>
            </button>
            <button on:click={compareAll} class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-2">
                <GitCompare size={20} />
                <span>Сравнить</span>
            </button>
            <button on:click={clearAll} class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-2">
                <Trash2 size={20} />
                <span>Очистить всё</span>
            </button>
            <button on:click={loadExample} class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-2">
                <Lightbulb size={20} />
                <span>Пример</span>
            </button>
        </div>

        <!-- JSON Inputs -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {#each jsonInputs as input, idx (input.id)}
                <div class="bg-white rounded-lg shadow-md p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-semibold text-gray-900">JSON #{idx + 1}</h3>
                        {#if jsonInputs.length > 2}
                            <button on:click={() => removeInput(input.id)} class="text-red-600 hover:text-red-800 transition">
                                <X size={20} />
                            </button>
                        {/if}
                    </div>
                    <textarea
                            bind:value={input.content}
                            placeholder="Вставьте JSON здесь..."
                            class="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    ></textarea>
                </div>
            {/each}
        </div>

        <!-- Comparison Result -->
        {#if comparisonResult}
            <div class="bg-white rounded-lg shadow-md p-6">
                <!-- Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">{stats.matches}</div>
                        <div class="text-sm text-gray-600">Совпадений</div>
                    </div>
                    <div class="bg-red-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-red-600">{stats.missing}</div>
                        <div class="text-sm text-gray-600">Отсутствует</div>
                    </div>
                    <div class="bg-pink-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-pink-600">{stats.different}</div>
                        <div class="text-sm text-gray-600">Различий</div>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-yellow-600">{stats.typeErrors}</div>
                        <div class="text-sm text-gray-600">Ошибок типов</div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="flex gap-2 mb-6 border-b border-gray-200">
                    <button
                            on:click={() => currentView = 'unified'}
                            class="px-4 py-2 font-medium transition {currentView === 'unified' ? 'bg-green-600 text-white rounded-t' : 'text-gray-600 hover:text-gray-900'}"
                    >
                        Unified
                    </button>
                    <button
                            on:click={() => currentView = 'tree'}
                            class="px-4 py-2 font-medium transition {currentView === 'tree' ? 'bg-green-600 text-white rounded-t' : 'text-gray-600 hover:text-gray-900'}"
                    >
                        Tree
                    </button>
                    <button
                            on:click={() => currentView = 'raw'}
                            class="px-4 py-2 font-medium transition {currentView === 'raw' ? 'bg-green-600 text-white rounded-t' : 'text-gray-600 hover:text-gray-900'}"
                    >
                        Raw JSON
                    </button>
                </div>

                <!-- Views -->
                {#if currentView === 'unified'}
                    <div class="space-y-6">
                        {#each comparisonResult.comparisons as comparison, idx}
                            <div>
                                <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <FileDiff size={20} />
                                    <span>Сравнение с JSON {idx + 2}</span>
                                </h3>
                                <div class="space-y-2">
                                    {#each comparison as diff}
                                        <div class="{getDiffClass(diff.type)} p-3 rounded text-sm">
                                            <div class="font-mono font-semibold text-gray-800 mb-1">{diff.path}</div>
                                            <div class="ml-4 text-gray-600">
                                                <div>Базовый: <code>{JSON.stringify(diff.value1)}</code></div>
                                                <div>Сравниваемый: <code>{JSON.stringify(diff.value2)}</code></div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else if currentView === 'tree'}
                    <div class="font-mono text-sm space-y-6">
                        {#each comparisonResult.comparisons as comparison, idx}
                            <div>
                                <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <GitBranch size={20} />
                                    <span>Дерево различий с JSON {idx + 2}</span>
                                </h3>
                                {#each comparison as diff}
                                    <div class="{getDiffColor(diff.type)} py-1">
                                        {diff.path}: {JSON.stringify(diff.value1)} → {JSON.stringify(diff.value2)}
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">{JSON.stringify(comparisonResult, null, 2)}</pre>
                {/if}
            </div>
        {/if}
    </main>
</div>