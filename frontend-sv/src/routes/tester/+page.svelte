<script lang="ts">
    import { onMount } from 'svelte';
    import { FlaskConical, Send, Plus, Settings, Lightbulb, Rocket, List, Hash, FileText, Shield, Save, FolderOpen, Trash2, Calendar, Copy, Clock, Package, Terminal, X, PlusCircle, CheckCircle, XCircle } from 'lucide-svelte';
    import { showAlert } from '$lib/stores';
    import { browser } from '$app/environment';

    interface Variable {
        name: string;
        value: string;
        enabled: boolean;
    }

    interface Header {
        key: string;
        value: string;
        enabled: boolean;
    }

    interface Param {
        key: string;
        value: string;
        enabled: boolean;
    }

    interface FormField {
        key: string;
        value: string;
        enabled: boolean;
    }

    interface SavedRequest {
        id: number;
        name: string;
        method: string;
        url: string;
        headers: Record<string, string>;
        params: Record<string, string>;
        body: string;
        bodyType: string;
        authType: string;
        createdAt: string;
    }

    let variables = $state<Variable[]>([]);
    let headers = $state<Header[]>([{ key: 'Content-Type', value: 'application/json', enabled: true }]);
    let params = $state<Param[]>([]);
    let formFields = $state<FormField[]>([]);

    let method = $state('GET');
    let url = $state('https://{base_url}/');
    let bodyType = $state('json');
    let bodyText = $state('{\n  "title": "Test Post",\n  "body": "This is a test post created via API Tester",\n  "userId": 1\n}');
    let authType = $state('none');
    let bearerToken = $state('');
    let basicUsername = $state('');
    let basicPassword = $state('');
    let apiKeyName = $state('');
    let apiKeyValue = $state('');
    let apiKeyLocation = $state('header');

    let activeTab = $state('headers');
    let activeResponseTab = $state('body');

    let responseBody = $state('');
    let responseHeaders = $state<Record<string, string>>({});
    let responseStatus = $state('');
    let responseStatusClass = $state('');
    let responseTime = $state('');
    let responseSize = $state('');
    let curlCommand = $state('');

    let loading = $state(false);
    let savedRequests = $state<SavedRequest[]>([]);

    onMount(() => {
        loadSavedVariables();
        loadSavedRequests();
        updateCurlCommand();
    });

    function loadSavedVariables() {
        const saved = localStorage.getItem('apiTesterVariables');
        if (saved) {
            const parsed = JSON.parse(saved);
            variables = Object.entries(parsed).map(([name, value]) => ({
                name,
                value: value as string,
                enabled: true
            }));
        } else {
            variables = [
                { name: 'base_url', value: 'jsonplaceholder.typicode.com', enabled: true },
                { name: 'api_key', value: 'your-api-key-here', enabled: true },
                { name: 'user_id', value: '1', enabled: true }
            ];
            saveVariables();
        }
    }

    function saveVariables() {
        const obj: Record<string, string> = {};
        variables.forEach(v => {
            if (v.enabled && v.name) {
                obj[v.name] = v.value;
            }
        });
        localStorage.setItem('apiTesterVariables', JSON.stringify(obj));
        updateCurlCommand();
    }

    function loadSavedRequests() {
        const saved = localStorage.getItem('apiTesterRequests');
        if (saved) {
            savedRequests = JSON.parse(saved);
        }
    }

    function addVariable() {
        variables.push({ name: '', value: '', enabled: true });
    }

    function removeVariable(index: number) {
        variables.splice(index, 1);
        saveVariables();
    }

    function addHeader() {
        headers.push({ key: '', value: '', enabled: true });
        updateCurlCommand();
    }

    function removeHeader(index: number) {
        headers.splice(index, 1);
        updateCurlCommand();
    }

    function addParam() {
        params.push({ key: '', value: '', enabled: true });
        updateCurlCommand();
    }

    function removeParam(index: number) {
        params.splice(index, 1);
        updateCurlCommand();
    }

    function addFormField() {
        formFields.push({ key: '', value: '', enabled: true });
        updateCurlCommand();
    }

    function removeFormField(index: number) {
        formFields.splice(index, 1);
        updateCurlCommand();
    }

    function replaceVariables(text: string): string {
        if (!text) return text;
        let result = text;
        variables.forEach(v => {
            if (v.enabled && v.name) {
                const regex = new RegExp(`\\{${v.name}\\}`, 'g');
                result = result.replace(regex, v.value);
            }
        });
        return result;
    }

    function getHeadersObj(): Record<string, string> {
        const obj: Record<string, string> = {};
        headers.forEach(h => {
            if (h.enabled && h.key) {
                obj[h.key] = replaceVariables(h.value);
            }
        });
        return obj;
    }

    function getParamsObj(): Record<string, string> {
        const obj: Record<string, string> = {};
        params.forEach(p => {
            if (p.enabled && p.key) {
                obj[p.key] = replaceVariables(p.value);
            }
        });
        return obj;
    }

    function getFormDataObj(): Record<string, string> {
        const obj: Record<string, string> = {};
        formFields.forEach(f => {
            if (f.enabled && f.key) {
                obj[f.key] = replaceVariables(f.value);
            }
        });
        return obj;
    }

    function applyAuth(headersObj: Record<string, string>, paramsObj: Record<string, string>) {
        if (authType === 'bearer' && bearerToken) {
            headersObj['Authorization'] = `Bearer ${replaceVariables(bearerToken)}`;
        } else if (authType === 'basic' && basicUsername && basicPassword) {
            const encoded = btoa(`${basicUsername}:${basicPassword}`);
            headersObj['Authorization'] = `Basic ${encoded}`;
        } else if (authType === 'apikey' && apiKeyName && apiKeyValue) {
            if (apiKeyLocation === 'header') {
                headersObj[apiKeyName] = replaceVariables(apiKeyValue);
            } else {
                paramsObj[apiKeyName] = replaceVariables(apiKeyValue);
            }
        }
    }

    async function sendRequest() {
        if (loading) return;

        let finalUrl = replaceVariables(url.trim());
        if (!finalUrl) {
            showAlert('Введите URL для запроса', 'error');
            return;
        }

        try {
            new URL(finalUrl);
        } catch {
            showAlert('Некорректный URL', 'error');
            return;
        }

        loading = true;
        responseStatus = '⏳ Отправка запроса...';
        responseStatusClass = 'bg-blue-50 text-blue-800 border-blue-200';

        const headersObj = getHeadersObj();
        const paramsObj = getParamsObj();
        applyAuth(headersObj, paramsObj);

        if (Object.keys(paramsObj).length > 0) {
            const urlObj = new URL(finalUrl);
            Object.entries(paramsObj).forEach(([key, value]) => {
                urlObj.searchParams.append(key, value);
            });
            finalUrl = urlObj.toString();
        }

        let body: string | null = null;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            if (bodyType === 'form') {
                const formData = getFormDataObj();
                headersObj['Content-Type'] = 'application/x-www-form-urlencoded';
                body = new URLSearchParams(formData).toString();
            } else {
                const text = replaceVariables(bodyText.trim());
                if (text) {
                    if (bodyType === 'json') {
                        try {
                            JSON.parse(text);
                            body = text;
                        } catch {
                            showAlert('Некорректный JSON', 'error');
                            loading = false;
                            return;
                        }
                    } else {
                        body = text;
                    }
                }
            }
        }

        const startTime = Date.now();

        try {
            const options: RequestInit = {
                method,
                headers: headersObj,
                mode: 'cors'
            };

            if (body) {
                options.body = body;
            }

            const response = await fetch(finalUrl, options);
            const endTime = Date.now();
            const duration = endTime - startTime;

            responseStatus = `${response.status} ${response.statusText}`;
            responseStatusClass = response.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200';
            responseTime = `${duration}ms`;

            const contentType = response.headers.get('content-type');
            let responseData: any;
            let size = 0;

            if (contentType?.includes('application/json')) {
                responseData = await response.json();
                const jsonString = JSON.stringify(responseData, null, 2);
                size = new Blob([jsonString]).size;
                responseBody = jsonString;
            } else {
                responseData = await response.text();
                size = new Blob([responseData]).size;
                responseBody = responseData;
            }

            responseSize = formatBytes(size);

            const respHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                respHeaders[key] = value;
            });
            responseHeaders = respHeaders;

            updateCurlCommand();
            showAlert('Запрос выполнен успешно!', 'success');

        } catch (error: any) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            responseStatus = '❌ Ошибка запроса';
            responseStatusClass = 'bg-red-50 text-red-800 border-red-200';
            responseTime = `${duration}ms`;
            responseBody = `Error: ${error.message}\n\nВозможные причины:\n- CORS блокировка\n- Сетевая ошибка\n- Неверный URL\n- Сервер недоступен`;

            showAlert('Ошибка: ' + error.message, 'error');
        } finally {
            loading = false;
        }
    }

    function updateCurlCommand() {
        let finalUrl = replaceVariables(url.trim());
        if (!finalUrl) {
            curlCommand = '';
            return;
        }

        const headersObj = getHeadersObj();
        const paramsObj = getParamsObj();
        applyAuth(headersObj, paramsObj);

        if (Object.keys(paramsObj).length > 0) {
            try {
                const urlObj = new URL(finalUrl);
                Object.entries(paramsObj).forEach(([key, value]) => {
                    urlObj.searchParams.append(key, value);
                });
                finalUrl = urlObj.toString();
            } catch {}
        }

        let curl = `curl -X ${method} '${finalUrl}'`;

        Object.entries(headersObj).forEach(([key, value]) => {
            curl += ` \\\n  -H '${key}: ${value}'`;
        });

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            if (bodyType === 'form') {
                const formData = getFormDataObj();
                Object.entries(formData).forEach(([key, value]) => {
                    curl += ` \\\n  --data-urlencode '${key}=${value}'`;
                });
            } else {
                const text = replaceVariables(bodyText.trim());
                if (text) {
                    const escaped = text.replace(/'/g, "'\\''");
                    curl += ` \\\n  -d '${escaped}'`;
                }
            }
        }

        curlCommand = curl;
    }

    function copyCurl() {
        if (!curlCommand) {
            showAlert('Нет cURL команды для копирования', 'error');
            return;
        }
        navigator.clipboard.writeText(curlCommand).then(() => {
            showAlert('cURL команда скопирована!', 'success');
        });
    }

    function saveRequest() {
        const name = prompt('Введите название запроса:');
        if (!name) return;

        const request: SavedRequest = {
            id: Date.now(),
            name,
            method,
            url,
            headers: getHeadersObj(),
            params: getParamsObj(),
            body: bodyText,
            bodyType,
            authType,
            createdAt: new Date().toISOString()
        };

        savedRequests.unshift(request);
        localStorage.setItem('apiTesterRequests', JSON.stringify(savedRequests));
        showAlert('Запрос сохранен!', 'success');
    }

    function loadRequest(req: SavedRequest) {
        method = req.method;
        url = req.url;
        bodyText = req.body || '';
        bodyType = req.bodyType || 'json';
        authType = req.authType || 'none';

        headers = Object.entries(req.headers || {}).map(([key, value]) => ({
            key,
            value,
            enabled: true
        }));

        params = Object.entries(req.params || {}).map(([key, value]) => ({
            key,
            value,
            enabled: true
        }));

        updateCurlCommand();
        showAlert('Запрос загружен!', 'success');
    }

    function deleteRequest(id: number) {
        if (!confirm('Удалить этот запрос?')) return;

        savedRequests = savedRequests.filter(r => r.id !== id);
        localStorage.setItem('apiTesterRequests', JSON.stringify(savedRequests));
        showAlert('Запрос удален', 'success');
    }

    function formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function syntaxHighlightJson(json: string): string {
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'text-blue-600';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'text-sky-600 font-semibold';
                } else {
                    cls = 'text-green-600';
                }
            } else if (/true|false/.test(match)) {
                cls = 'text-pink-600 font-bold';
            } else if (/null/.test(match)) {
                cls = 'text-gray-500 font-bold';
            }
            return `<span class="${cls}">${match}</span>`;
        });
    }

    $effect(() => {
        updateCurlCommand();
    });
</script>

<svelte:head>
    <title>API Tester - Webhook Viewer</title>
</svelte:head>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div class="mb-6">
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
                <div class="bg-gradient-to-r from-green-600 to-emerald-600 w-12 h-12 rounded-full flex items-center justify-center">
                    <FlaskConical size={24} class="text-white" />
                </div>
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">API Tester</h1>
                    <p class="text-gray-600 mt-1">Тестирование REST API запросов как в Postman</p>
                </div>
            </div>
            <div class="flex items-center space-x-3">
                <div class="text-sm text-gray-500 flex items-center gap-2">
                    <span class="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Готов к работе</span>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
            <!-- Variables -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Settings size={20} class="text-green-600" />
                        <span>Переменные окружения</span>
                    </h2>
                    <button onclick={addVariable} class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                        <Plus size={16} />
                        <span>Добавить</span>
                    </button>
                </div>
                <div class="space-y-3">
                    {#each variables as variable, i}
                        <div class="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                            <input type="checkbox" bind:checked={variable.enabled} onchange={saveVariables} class="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                            <input type="text" bind:value={variable.name} onchange={saveVariables} placeholder="Variable name" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            <input type="text" bind:value={variable.value} onchange={saveVariables} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            <button onclick={() => removeVariable(i)} class="text-red-500 hover:text-red-700 p-1">
                                <X size={20} />
                            </button>
                        </div>
                    {/each}
                </div>
                <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="text-sm text-blue-800 flex items-start gap-2">
                        <Lightbulb size={16} class="flex-shrink-0 mt-0.5" />
                        <span><strong>Совет:</strong> Используйте {'{'}variable_name{'}'} в URL, заголовках или теле запроса</span>
                    </div>
                </div>
            </div>

            <!-- Request Builder -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
                <h2 class="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Rocket size={20} class="text-green-600" />
                    <span>Конструктор запроса</span>
                </h2>

                <div class="flex gap-3 mb-6">
                    <select bind:value={method} class="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold bg-white">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                        <option value="HEAD">HEAD</option>
                        <option value="OPTIONS">OPTIONS</option>
                    </select>
                    <input
                            type="text"
                            bind:value={url}
                            placeholder="https://api.example.com/endpoint"
                            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                            onclick={sendRequest}
                            disabled={loading}
                            class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send size={16} />
                        <span>{loading ? 'Отправка...' : 'Отправить'}</span>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="border-b border-gray-200 mb-6">
                    <div class="flex space-x-8">
                        <button onclick={() => activeTab = 'headers'} class="pb-3 flex items-center gap-2 {activeTab === 'headers' ? 'border-b-3 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
                            <List size={16} />
                            <span>Headers</span>
                        </button>
                        <button onclick={() => activeTab = 'params'} class="pb-3 flex items-center gap-2 {activeTab === 'params' ? 'border-b-3 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
                            <Hash size={16} />
                            <span>Query Params</span>
                        </button>
                        <button onclick={() => activeTab = 'body'} class="pb-3 flex items-center gap-2 {activeTab === 'body' ? 'border-b-3 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
                            <FileText size={16} />
                            <span>Body</span>
                        </button>
                        <button onclick={() => activeTab = 'auth'} class="pb-3 flex items-center gap-2 {activeTab === 'auth' ? 'border-b-3 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
                            <Shield size={16} />
                            <span>Auth</span>
                        </button>
                    </div>
                </div>

                <!-- Headers Tab -->
                {#if activeTab === 'headers'}
                    <div class="space-y-3">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-gray-700">Заголовки запроса</span>
                            <button onclick={addHeader} class="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1">
                                <PlusCircle size={16} />
                                <span>Добавить заголовок</span>
                            </button>
                        </div>
                        {#each headers as header, i}
                            <div class="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                                <input type="checkbox" bind:checked={header.enabled} class="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                <input type="text" bind:value={header.key} placeholder="Key" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                <input type="text" bind:value={header.value} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                <button onclick={() => removeHeader(i)} class="text-red-500 hover:text-red-700 p-1">
                                    <X size={20} />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- Params Tab -->
                {#if activeTab === 'params'}
                    <div class="space-y-3">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-gray-700">Query параметры</span>
                            <button onclick={addParam} class="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1">
                                <PlusCircle size={16} />
                                <span>Добавить параметр</span>
                            </button>
                        </div>
                        {#each params as param, i}
                            <div class="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                                <input type="checkbox" bind:checked={param.enabled} class="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                <input type="text" bind:value={param.key} placeholder="Key" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                <input type="text" bind:value={param.value} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                <button onclick={() => removeParam(i)} class="text-red-500 hover:text-red-700 p-1">
                                    <X size={20} />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- Body Tab -->
                {#if activeTab === 'body'}
                    <div class="space-y-3">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-gray-700">Тело запроса</span>
                            <select bind:value={bodyType} class="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option value="json">JSON</option>
                                <option value="text">Text</option>
                                <option value="form">Form Data</option>
                                <option value="raw">Raw</option>
                            </select>
                        </div>
                        {#if bodyType === 'form'}
                            <button onclick={addFormField} class="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1 mb-3">
                                <PlusCircle size={16} />
                                <span>Добавить поле</span>
                            </button>
                            {#each formFields as field, i}
                                <div class="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                                    <input type="checkbox" bind:checked={field.enabled} class="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                    <input type="text" bind:value={field.key} placeholder="Key" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                    <input type="text" bind:value={field.value} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                    <button onclick={() => removeFormField(i)} class="text-red-500 hover:text-red-700 p-1">
                                        <X size={20} />
                                    </button>
                                </div>
                            {/each}
                        {:else}
                            <textarea
                                    bind:value={bodyText}
                                    rows={12}
                                    placeholder='{"\"key\": \"value\""}'
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                            ></textarea>
                        {/if}
                    </div>
                {/if}

                <!-- Auth Tab -->
                {#if activeTab === 'auth'}
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Тип авторизации</label>
                            <select bind:value={authType} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option value="none">No Auth</option>
                                <option value="bearer">Bearer Token</option>
                                <option value="basic">Basic Auth</option>
                                <option value="apikey">API Key</option>
                            </select>
                        </div>
                        {#if authType === 'bearer'}
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Bearer Token</label>
                                <input type="text" bind:value={bearerToken} placeholder="your-token-here" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                        {:else if authType === 'basic'}
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                    <input type="text" bind:value={basicUsername} placeholder="username" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                    <input type="password" bind:value={basicPassword} placeholder="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                            </div>
                        {:else if authType === 'apikey'}
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Key</label>
                                    <input type="text" bind:value={apiKeyName} placeholder="X-API-Key" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Value</label>
                                    <input type="text" bind:value={apiKeyValue} placeholder="your-api-key" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Add to</label>
                                    <select bind:value={apiKeyLocation} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="header">Header</option>
                                        <option value="query">Query Params</option>
                                    </select>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Response Panel -->
        <div class="lg:col-span-1">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24 transition-all hover:shadow-md">
                <h2 class="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <FileText size={20} class="text-green-600" />
                    <span>Ответ сервера</span>
                </h2>

                {#if responseStatus}
                    <div class="mb-4 p-4 rounded-lg font-semibold border {responseStatusClass}">
                        {responseStatus}
                    </div>
                {/if}

                {#if responseTime || responseSize}
                    <div class="flex gap-4 mb-4">
                        {#if responseTime}
                            <div class="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                <Clock size={16} />
                                <span>{responseTime}</span>
                            </div>
                        {/if}
                        {#if responseSize}
                            <div class="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                <Package size={16} />
                                <span>{responseSize}</span>
                            </div>
                        {/if}
                    </div>
                {/if}

                <div class="border-b border-gray-200 mb-4">
                    <div class="flex space-x-6">
                        <button onclick={() => activeResponseTab = 'body'} class="pb-2 text-sm flex items-center gap-1 {activeResponseTab === 'body' ? 'border-b-3 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
                            <FileText size={16} />
                            <span>Body</span>
                        </button>
                        <button onclick={() => activeResponseTab = 'headers'} class="pb-2 text-sm flex items-center gap-1 {activeResponseTab === 'headers' ? 'border-b-3 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
                            <List size={16} />
                            <span>Headers</span>
                        </button>
                        <button onclick={() => activeResponseTab = 'curl'} class="pb-2 text-sm flex items-center gap-1 {activeResponseTab === 'curl' ? 'border-b-3 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
                            <Terminal size={16} />
                            <span>cURL</span>
                        </button>
                    </div>
                </div>

                {#if activeResponseTab === 'body'}
                    <div class="bg-gray-50 rounded-lg min-h-[400px] max-h-[600px] overflow-auto">
                        {#if responseBody}
                            <div class="bg-gray-900 text-gray-100 p-4 rounded-lg">
                                <pre class="text-xs font-mono">{@html syntaxHighlightJson(responseBody)}</pre>
                            </div>
                        {:else}
                            <div class="text-gray-400 text-center py-16">
                                <FileText size={64} class="mx-auto mb-4 text-gray-300" />
                                <p class="text-lg font-medium">Готов к запросу</p>
                                <p class="text-sm mt-2">Нажмите "Отправить" для выполнения запроса</p>
                            </div>
                        {/if}
                    </div>
                {:else if activeResponseTab === 'headers'}
                    <div class="bg-gray-50 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-auto text-sm">
                        {#if Object.keys(responseHeaders).length > 0}
                            {#each Object.entries(responseHeaders) as [key, value]}
                                <div class="mb-2">
                                    <strong class="text-gray-700">{key}:</strong>
                                    <span class="text-gray-600 ml-2">{value}</span>
                                </div>
                            {/each}
                        {:else}
                            <div class="text-gray-400 text-center py-16">
                                <p>Заголовки ответа появятся здесь</p>
                            </div>
                        {/if}
                    </div>
                {:else if activeResponseTab === 'curl'}
                    <div class="bg-gray-900 text-green-400 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-auto text-xs font-mono">
                        {#if curlCommand}
                            <pre>{curlCommand}</pre>
                        {:else}
                            <div class="text-gray-400 text-center py-16">
                                <p>cURL команда появится здесь</p>
                            </div>
                        {/if}
                    </div>
                    {#if curlCommand}
                        <button onclick={copyCurl} class="mt-3 w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-sm flex items-center justify-center gap-2">
                            <Copy size={16} />
                            <span>Копировать cURL</span>
                        </button>
                    {/if}
                {/if}
            </div>
        </div>
    </div>

    <!-- Saved Requests -->
    <div class="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Save size={20} class="text-green-600" />
                <span>Сохраненные запросы</span>
            </h2>
            <button onclick={saveRequest} class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium shadow-sm hover:shadow-md flex items-center gap-2">
                <Save size={16} />
                <span>Сохранить текущий</span>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#if savedRequests.length === 0}
                <div class="col-span-full text-center text-gray-400 py-12">
                    <FolderOpen size={64} class="mx-auto mb-4 text-gray-300" />
                    <p>Нет сохраненных запросов</p>
                    <p class="text-sm mt-2">Сохраните текущий запрос для быстрого доступа</p>
                </div>
            {:else}
                {#each savedRequests as req}
                    <div class="border border-gray-200 rounded-lg p-4 hover:border-green-500 hover:shadow-md transition-all cursor-pointer bg-white">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1" onclick={() => loadRequest(req)}>
                                <div class="font-semibold text-gray-800 mb-2">{req.name}</div>
                                <div class="flex items-center gap-2 text-sm mb-2">
                                    <span class="px-2 py-1 rounded text-white text-xs font-semibold" style="background: {req.method === 'GET' ? '#10b981' : req.method === 'POST' ? '#f59e0b' : req.method === 'PUT' ? '#3b82f6' : req.method === 'DELETE' ? '#ef4444' : '#6b7280'}">{req.method}</span>
                                    <span class="text-gray-500 truncate flex-1">{req.url}</span>
                                </div>
                                <div class="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar size={12} />
                                    <span>{new Date(req.createdAt).toLocaleDateString('ru-RU')}</span>
                                </div>
                            </div>
                            <button onclick={(e) => { e.stopPropagation(); deleteRequest(req.id); }} class="text-red-500 hover:text-red-700 ml-2 p-1">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</main>

<style>
    .border-b-3 {
        border-bottom-width: 3px;
    }
</style>