<script lang="ts">
	import { onMount } from 'svelte';
	import { FlaskConical, Send, Plus, Trash2, Settings, Rocket, List, Hash, FileText, Lock } from 'lucide-svelte';
	import Alert from '$components/Alert.svelte';

	type Variable = { key: string; value: string };
	type Header = { key: string; value: string; enabled: boolean };
	type QueryParam = { key: string; value: string; enabled: boolean };

	let method = 'GET';
	let url = 'https://api.example.com/endpoint';
	let variables: Variable[] = [{ key: 'base_url', value: 'api.example.com' }];
	let headers: Header[] = [{ key: 'Content-Type', value: 'application/json', enabled: true }];
	let queryParams: QueryParam[] = [];
	let requestBody = '';
	let authType = 'none';
	let authToken = '';

	let currentTab: 'headers' | 'params' | 'body' | 'auth' = 'headers';
	let isLoading = false;
	let response: any = null;
	let responseTime = 0;

	let alertVisible = false;
	let alertMessage = '';
	let alertType: 'success' | 'error' | 'warning' = 'success';

	function showAlert(message: string, type: 'success' | 'error' | 'warning') {
		alertMessage = message;
		alertType = type;
		alertVisible = true;
		setTimeout(() => { alertVisible = false; }, 5000);
	}

	function addVariable() {
		variables = [...variables, { key: '', value: '' }];
	}

	function removeVariable(idx: number) {
		variables = variables.filter((_, i) => i !== idx);
	}

	function addHeader() {
		headers = [...headers, { key: '', value: '', enabled: true }];
	}

	function removeHeader(idx: number) {
		headers = headers.filter((_, i) => i !== idx);
	}

	function addQueryParam() {
		queryParams = [...queryParams, { key: '', value: '', enabled: true }];
	}

	function removeQueryParam(idx: number) {
		queryParams = queryParams.filter((_, i) => i !== idx);
	}

	function replaceVariables(text: string): string {
		let result = text;
		variables.forEach(v => {
			if (v.key && v.value) {
				result = result.replace(new RegExp(`\\{${v.key}\\}`, 'g'), v.value);
			}
		});
		return result;
	}

	async function sendRequest() {
		isLoading = true;
		response = null;

		try {
			let finalUrl = replaceVariables(url);

			// Add query params
			const enabledParams = queryParams.filter(p => p.enabled && p.key);
			if (enabledParams.length > 0) {
				const query = new URLSearchParams();
				enabledParams.forEach(p => query.append(p.key, replaceVariables(p.value)));
				finalUrl += (finalUrl.includes('?') ? '&' : '?') + query.toString();
			}

			const requestHeaders: Record<string, string> = {};
			headers.filter(h => h.enabled && h.key).forEach(h => {
				requestHeaders[h.key] = replaceVariables(h.value);
			});

			if (authType === 'bearer' && authToken) {
				requestHeaders['Authorization'] = `Bearer ${authToken}`;
			}

			const options: RequestInit = {
				method,
				headers: requestHeaders
			};

			if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody) {
				options.body = replaceVariables(requestBody);
			}

			const startTime = Date.now();
			const res = await fetch(finalUrl, options);
			responseTime = Date.now() - startTime;

			const contentType = res.headers.get('content-type');
			let data: any;

			if (contentType?.includes('application/json')) {
				data = await res.json();
			} else {
				data = await res.text();
			}

			response = {
				status: res.status,
				statusText: res.statusText,
				headers: Object.fromEntries(res.headers.entries()),
				data
			};

			showAlert(`Запрос выполнен (${responseTime}ms)`, 'success');
		} catch (error: any) {
			showAlert(`Ошибка: ${error.message}`, 'error');
			response = {
				status: 0,
				statusText: 'Error',
				headers: {},
				data: { error: error.message }
			};
		} finally {
			isLoading = false;
		}
	}

	function getStatusClass(status: number): string {
		if (status >= 200 && status < 300) return 'bg-green-100 text-green-800 border-green-300';
		if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800 border-blue-300';
		if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
		if (status >= 500) return 'bg-red-100 text-red-800 border-red-300';
		return 'bg-gray-100 text-gray-800 border-gray-300';
	}

	function formatJson(obj: any): string {
		try {
			return JSON.stringify(obj, null, 2);
		} catch {
			return String(obj);
		}
	}
</script>

<svelte:head>
	<title>API Tester - Webhook Viewer</title>
</svelte:head>

<div class="bg-gray-50 min-h-screen">
	<!-- Alert -->
	{#if alertVisible}
		<div class="fixed top-20 right-4 z-50 max-w-md">
			<Alert message={alertMessage} type={alertType} visible={alertVisible} />
		</div>
	{/if}

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center space-x-4">
				<div class="bg-gradient-to-r from-green-600 to-emerald-600 w-12 h-12 rounded-full flex items-center justify-center">
					<FlaskConical size={24} class="text-white" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">API Tester</h1>
					<p class="text-gray-600 mt-1">Тестирование REST API запросов</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Panel -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Variables -->
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
							<Settings size={20} class="text-green-600" />
							<span>Переменные окружения</span>
						</h2>
						<button on:click={addVariable} class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-2">
							<Plus size={16} />
							<span>Добавить</span>
						</button>
					</div>
					<div class="space-y-3">
						{#each variables as variable, idx}
							<div class="flex gap-2">
								<input bind:value={variable.key} placeholder="key" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
								<input bind:value={variable.value} placeholder="value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
								<button on:click={() => removeVariable(idx)} class="text-red-600 hover:text-red-800">
									<Trash2 size={18} />
								</button>
							</div>
						{/each}
					</div>
					<div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
						<strong>Совет:</strong> Используйте &#123;variable_name&#125; в URL, заголовках или теле запроса
					</div>
				</div>

				<!-- Request Builder -->
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
						<Rocket size={20} class="text-green-600" />
						<span>Конструктор запроса</span>
					</h2>

					<!-- Method & URL -->
					<div class="flex gap-3 mb-6">
						<select bind:value={method} class="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold bg-white">
							<option value="GET">GET</option>
							<option value="POST">POST</option>
							<option value="PUT">PUT</option>
							<option value="PATCH">PATCH</option>
							<option value="DELETE">DELETE</option>
						</select>
						<input bind:value={url} type="text" placeholder="https://api.example.com/endpoint" class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
						<button on:click={sendRequest} disabled={isLoading} class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2">
							<Send size={16} />
							<span>{isLoading ? 'Загрузка...' : 'Отправить'}</span>
						</button>
					</div>

					<!-- Tabs -->
					<div class="border-b border-gray-200 mb-6">
						<div class="flex space-x-8">
							<button on:click={() => currentTab = 'headers'} class="pb-3 {currentTab === 'headers' ? 'border-b-2 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-2">
								<List size={16} />
								<span>Headers</span>
							</button>
							<button on:click={() => currentTab = 'params'} class="pb-3 {currentTab === 'params' ? 'border-b-2 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-2">
								<Hash size={16} />
								<span>Query Params</span>
							</button>
							<button on:click={() => currentTab = 'body'} class="pb-3 {currentTab === 'body' ? 'border-b-2 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-2">
								<FileText size={16} />
								<span>Body</span>
							</button>
							<button on:click={() => currentTab = 'auth'} class="pb-3 {currentTab === 'auth' ? 'border-b-2 border-green-600 text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-2">
								<Lock size={16} />
								<span>Auth</span>
							</button>
						</div>
					</div>

					<!-- Tab Content -->
					{#if currentTab === 'headers'}
						<div class="space-y-3">
							<button on:click={addHeader} class="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
								<Plus size={14} />
								<span>Добавить заголовок</span>
							</button>
							{#each headers as header, idx}
								<div class="flex gap-2 items-center">
									<input type="checkbox" bind:checked={header.enabled} class="w-4 h-4" />
									<input bind:value={header.key} placeholder="Key" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
									<input bind:value={header.value} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
									<button on:click={() => removeHeader(idx)} class="text-red-600 hover:text-red-800">
										<Trash2 size={18} />
									</button>
								</div>
							{/each}
						</div>
					{:else if currentTab === 'params'}
						<div class="space-y-3">
							<button on:click={addQueryParam} class="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
								<Plus size={14} />
								<span>Добавить параметр</span>
							</button>
							{#each queryParams as param, idx}
								<div class="flex gap-2 items-center">
									<input type="checkbox" bind:checked={param.enabled} class="w-4 h-4" />
									<input bind:value={param.key} placeholder="Key" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
									<input bind:value={param.value} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
									<button on:click={() => removeQueryParam(idx)} class="text-red-600 hover:text-red-800">
										<Trash2 size={18} />
									</button>
								</div>
							{/each}
						</div>
					{:else if currentTab === 'body'}
						<textarea bind:value={requestBody} placeholder="&#123;&#10;  &quot;key&quot;: &quot;value&quot;&#10;&#125;" class="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm resize-none"></textarea>
					{:else if currentTab === 'auth'}
						<div class="space-y-4">
							<select bind:value={authType} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
								<option value="none">No Auth</option>
								<option value="bearer">Bearer Token</option>
							</select>
							{#if authType === 'bearer'}
								<input bind:value={authToken} type="text" placeholder="Token" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Right Panel - Response -->
			<div class="lg:col-span-1">
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
					<h2 class="text-lg font-semibold text-gray-800 mb-4">Ответ</h2>
					
					{#if response}
						<div class="space-y-4">
							<div class="flex items-center gap-2">
								<span class="px-3 py-1 rounded-lg border font-semibold text-sm {getStatusClass(response.status)}">
									{response.status} {response.statusText}
								</span>
								<span class="text-sm text-gray-600">{responseTime}ms</span>
							</div>

							<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96 text-xs font-mono">
								<pre>{formatJson(response.data)}</pre>
							</div>

							<details class="text-sm">
								<summary class="cursor-pointer font-medium text-gray-700 hover:text-gray-900">Headers</summary>
								<div class="mt-2 space-y-1 text-xs font-mono">
									{#each Object.entries(response.headers) as [key, value]}
										<div class="text-gray-600">
											<span class="text-blue-600">{key}:</span> {value}
										</div>
									{/each}
								</div>
							</details>
						</div>
					{:else}
						<p class="text-gray-500 text-sm text-center py-8">Отправьте запрос чтобы увидеть ответ</p>
					{/if}
				</div>
			</div>
		</div>
	</main>
</div>
