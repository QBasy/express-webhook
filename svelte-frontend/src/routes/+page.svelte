<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { authState } from '$stores/auth.svelte';
	import { i18n } from '$stores/i18n.svelte';
	import { api } from '$lib/utils/api';
	import { 
		Search, Loader2, Trash2, AlertCircle, Inbox,
		CheckCircle, XCircle, Eye, TestTube2, RefreshCw,
		Download, Send, FolderOpen
	} from 'lucide-svelte';
	
	// State
	let roomId = $state('');
	let roomStatus = $state<'disconnected' | 'connected'>('disconnected');
	let roomUrl = $state('');
	let rooms = $state<any[]>([]);
	let allHooks = $state<any[]>([]);
	let loadingRooms = $state(false);
	let loading = $state(false);
	let fakeErrorEnabled = $state(false);
	let fakeErrorCode = $state(500);
	let sortOrder = $state<'newest' | 'oldest'>('newest');
	let searchTerm = $state('');
	let currentPage = $state(1);
	let itemsPerPage = $state(25);
	let showRoomsList = $state(false);
	let isOnline = $state(true);
	let reconnectAttempts = $state(0);
	
	// Polling
	let pollInterval: any = null;
	let lastIds = new Set<string>();
	
	onMount(async () => {
		if (!authState.isAuthenticated) {
			goto('/login');
			return;
		}
		await loadMyRooms();
		
		// Monitor online/offline
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
	});
	
	onDestroy(() => {
		stopPolling();
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
	});
	
	function handleOnline() {
		isOnline = true;
		reconnectAttempts = 0;
		if (roomId) {
			showAlert('Интернет восстановлен', 'success');
			startPolling();
		}
	}
	
	function handleOffline() {
		isOnline = false;
		showAlert('Потеряно соединение', 'error');
		stopPolling();
	}
	
	async function loadMyRooms() {
		loadingRooms = true;
		try {
			const data = await api.getMyRooms();
			rooms = data.rooms || [];
		} catch (e) {
			console.error('Failed to load rooms:', e);
		} finally {
			loadingRooms = false;
		}
	}
	
	async function createOrJoinRoom() {
		if (!roomId.trim()) {
			showAlert(i18n.locale === 'ru' ? 'Введите Room ID' : 'Enter Room ID', 'warning');
			return;
		}
		
		try {
			const result = await api.createRoom(roomId);
			roomStatus = 'connected';
			roomUrl = result.webhookUrl || `${window.location.origin}/hook/${roomId}`;
			
			await Promise.all([
				loadWebhooks(),
				loadMyRooms(),
				updateFakeErrorStatus()
			]);
			
			startPolling();
			showAlert(i18n.locale === 'ru' ? 'Комната создана!' : 'Room created!', 'success');
		} catch (e: any) {
			showAlert('Ошибка: ' + e.message, 'error');
		}
	}
	
	async function closeRoom() {
		if (!roomId.trim()) {
			showAlert(i18n.locale === 'ru' ? 'Нет активной комнаты' : 'No active room', 'warning');
			return;
		}
		
		if (!confirm(i18n.locale === 'ru' ? 'Закрыть комнату?' : 'Close room?')) return;
		
		try {
			await api.deleteRoom(roomId);
			stopPolling();
			roomStatus = 'disconnected';
			roomUrl = '';
			roomId = '';
			allHooks = [];
			lastIds.clear();
			currentPage = 1;
			fakeErrorEnabled = false;
			fakeErrorCode = 500;
			
			await loadMyRooms();
			showAlert(i18n.locale === 'ru' ? 'Комната закрыта' : 'Room closed', 'success');
		} catch (e: any) {
			showAlert('Ошибка: ' + e.message, 'error');
		}
	}
	
	async function loadWebhooks() {
		if (!roomId.trim()) return;
		
		loading = true;
		try {
			const data = await api.getWebhooks(roomId);
			processWebhooks(data);
		} catch (e: any) {
			showAlert('Ошибка загрузки: ' + e.message, 'error');
		} finally {
			loading = false;
		}
	}
	
	function startPolling() {
		stopPolling();
		pollInterval = setInterval(async () => {
			if (!roomId || !isOnline) return;
			
			try {
				const data = await api.getWebhooks(roomId);
				processWebhooks(data);
				
				if (reconnectAttempts > 0) {
					reconnectAttempts = 0;
					showAlert('Соединение восстановлено', 'success');
				}
			} catch (e) {
				console.error('Polling error:', e);
				attemptReconnect();
			}
		}, 2000); // Poll every 2 seconds
	}
	
	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}
	
	function processWebhooks(hooks: any[]) {
		if (!hooks || hooks.length === 0) return;
		
		let hasNew = false;
		hooks.forEach(hook => {
			const id = hook._id || hook.receiptId;
			if (!lastIds.has(id)) {
				lastIds.add(id);
				allHooks = [hook, ...allHooks]; // Add to beginning
				hasNew = true;
			}
		});
		
		// Trigger re-render if new hooks
		if (hasNew) {
			allHooks = allHooks;
		}
	}
	
	function attemptReconnect() {
		if (!roomId) return;
		
		reconnectAttempts++;
		const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
		
		setTimeout(async () => {
			try {
				await api.getWebhooks(roomId);
				reconnectAttempts = 0;
				showAlert('Соединение восстановлено', 'success');
			} catch (e) {
				if (reconnectAttempts < 5) {
					attemptReconnect();
				}
			}
		}, delay);
	}
	
	async function updateFakeErrorStatus() {
		if (!roomId) return;
		try {
			const data = await api.getFakeErrorStatus(roomId);
			fakeErrorEnabled = data.enabled || false;
			fakeErrorCode = data.statusCode || 500;
		} catch (e) {
			console.error('Failed to load fake error status:', e);
		}
	}
	
	async function toggleFakeError() {
		if (!roomId) {
			fakeErrorEnabled = false;
			showAlert(i18n.locale === 'ru' ? 'Нет активной комнаты' : 'No active room', 'warning');
			return;
		}
		
		try {
			await api.setFakeError(roomId, fakeErrorEnabled, fakeErrorCode);
			showAlert(
				fakeErrorEnabled 
					? `Симуляция ${fakeErrorCode} включена`
					: 'Симуляция отключена',
				'success'
			);
		} catch (e: any) {
			fakeErrorEnabled = !fakeErrorEnabled;
			showAlert('Ошибка: ' + e.message, 'error');
		}
	}
	
	async function sendTestWebhook() {
		if (!roomId) {
			showAlert(i18n.locale === 'ru' ? 'Нет активной комнаты' : 'No active room', 'warning');
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
			const webhookUrl = `${window.location.origin}/hook/${roomId}`;
			const res = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(testData)
			});
			
			if (!res.ok) throw new Error(String(res.status));
			showAlert('Тестовый вебхук отправлен', 'success');
		} catch (e: any) {
			showAlert('Ошибка отправки: ' + e.message, 'error');
		}
	}
	
	async function deleteWebhook(webhookId: string) {
		if (!roomId) return;
		if (!confirm(i18n.locale === 'ru' ? 'Удалить?' : 'Delete?')) return;
		
		try {
			await api.deleteWebhook(roomId, webhookId);
			allHooks = allHooks.filter(h => (h._id || h.receiptId) !== webhookId);
			lastIds.delete(webhookId);
			showAlert('Вебхук удалён', 'success');
		} catch (e: any) {
			showAlert('Ошибка: ' + e.message, 'error');
		}
	}
	
	async function clearAllWebhooks() {
		if (!roomId) return;
		if (!confirm(i18n.locale === 'ru' ? 'Очистить все?' : 'Clear all?')) return;
		
		try {
			await api.clearWebhooks(roomId);
			allHooks = [];
			lastIds.clear();
			currentPage = 1;
			showAlert('Вебхуки очищены', 'success');
		} catch (e: any) {
			showAlert('Ошибка: ' + e.message, 'error');
		}
	}
	
	function exportWebhooks() {
		if (allHooks.length === 0) {
			showAlert('Нет данных для экспорта', 'warning');
			return;
		}
		
		const dataStr = JSON.stringify(allHooks, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `webhooks_${roomId || 'no-room'}_${Date.now()}.json`;
		link.click();
		URL.revokeObjectURL(url);
		showAlert('Экспорт завершён', 'success');
	}
	
	async function openRoom(rid: string) {
		roomId = rid;
		roomStatus = 'connected';
		await loadWebhooks();
		await updateFakeErrorStatus();
		startPolling();
		
		if (window.innerWidth < 1024) {
			showRoomsList = false;
		}
	}
	
	// Computed values
	let filteredHooks = $derived((() => {
		let filtered = allHooks.filter(hook => {
			if (!searchTerm) return true;
			const bodyStr = JSON.stringify(hook.body || hook).toLowerCase();
			const id = (hook._id || hook.receiptId || '').toString();
			return bodyStr.includes(searchTerm.toLowerCase()) || id.includes(searchTerm);
		});
		
		if (sortOrder === 'oldest') {
			filtered = [...filtered].reverse();
		}
		
		return filtered;
	})());
	
	let totalPages = $derived(Math.ceil(filteredHooks.length / itemsPerPage));
	
	let paginatedHooks = $derived((() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredHooks.slice(start, start + itemsPerPage);
	})());
	
	let pageNumbers = $derived((() => {
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
	})());
	
	// Utilities
	function formatTimestamp(ts: any) {
		if (!ts) return 'Недавно';
		const date = new Date(ts);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		
		if (diff < 60000) return 'Только что';
		if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
		
		return date.toLocaleString(i18n.locale === 'ru' ? 'ru-RU' : 'en-US', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
	function syntaxHighlight(json: any): string {
		let jsonStr = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
		
		jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		
		return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
			let cls = 'json-number';
			if (/^"/.test(match)) {
				if (/:$/.test(match)) {
					cls = 'json-key';
					const key = match.slice(1, -2);
					return `<span class="${cls}" onclick="copyValue(event, '${escapeHtml(key)}')" title="Копировать ключ">${match}</span>`;
				} else {
					cls = 'json-string';
					const val = match.slice(1, -1);
					return `<span class="${cls}" onclick="copyValue(event, '${escapeHtml(val)}')" title="Копировать значение">${match}</span>`;
				}
			} else if (/true|false/.test(match)) {
				cls = 'json-boolean';
			} else if (/null/.test(match)) {
				cls = 'json-null';
			}
			return `<span class="${cls}">${match}</span>`;
		});
	}
	
	function escapeHtml(text: string): string {
		return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
	}
	
	function copyToClipboard(text: string, event: MouseEvent) {
		navigator.clipboard.writeText(text).then(() => {
			showCopyIndicator(event);
		});
	}
	
	function showCopyIndicator(event: MouseEvent) {
		const indicator = document.createElement('div');
		indicator.className = 'copy-indicator';
		indicator.textContent = '✓ Скопировано';
		indicator.style.left = event.pageX + 'px';
		indicator.style.top = event.pageY + 'px';
		document.body.appendChild(indicator);
		
		setTimeout(() => {
			indicator.style.opacity = '0';
			setTimeout(() => indicator.remove(), 300);
		}, 1000);
	}
	
	function showAlert(message: string, type: 'success' | 'error' | 'warning') {
		const colors = {
			success: 'bg-green-100 text-green-800 border-green-400',
			error: 'bg-red-100 text-red-800 border-red-400',
			warning: 'bg-yellow-100 text-yellow-800 border-yellow-400'
		};
		
		const icons = {
			success: '✓',
			error: '✕',
			warning: '⚠'
		};
		
		const alert = document.createElement('div');
		alert.className = `fixed top-20 right-6 px-5 py-3 rounded-lg border-l-4 ${colors[type]} shadow-2xl z-50 max-w-md alert-slide-in`;
		alert.innerHTML = `
			<div class="flex items-center gap-3">
				<span class="text-xl font-bold">${icons[type]}</span>
				<span class="font-medium">${message}</span>
			</div>
		`;
		document.body.appendChild(alert);
		
		setTimeout(() => {
			alert.style.opacity = '0';
			alert.style.transform = 'translateX(100%)';
			setTimeout(() => alert.remove(), 300);
		}, 4000);
	}
	
	// Global function for syntax highlighting clicks
	if (typeof window !== 'undefined') {
		(window as any).copyValue = (event: MouseEvent, value: string) => {
			event.stopPropagation();
			const decoded = value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
			copyToClipboard(decoded, event);
		};
	}
</script>

<div class="flex h-[calc(100vh-80px)] bg-gradient-to-br from-gray-50 to-gray-100">
	<!-- LEFT SIDEBAR -->
	<aside class="w-80 bg-white shadow-lg border-r border-gray-200 p-6 space-y-6 overflow-y-auto custom-scrollbar">
		<!-- Room Management -->
		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
				<span class="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-green-600">
					<Eye size={16} />
				</span>
				{i18n.locale === 'ru' ? 'Управление комнатой' : 'Room Management'}
			</h2>
			
			<!-- Connection Status -->
			<div class="{roomStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} 
						flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-3 
						{roomStatus === 'disconnected' && reconnectAttempts > 0 ? 'connection-lost' : ''}">
				<span class="w-2 h-2 rounded-full {roomStatus === 'connected' ? 'bg-green-500 pulse-dot' : 'bg-gray-500'}"></span>
				<span>
					{#if reconnectAttempts > 0}
						Переподключение... ({reconnectAttempts})
					{:else if roomStatus === 'connected'}
						{i18n.locale === 'ru' ? 'Подключено' : 'Connected'}
					{:else}
						{i18n.locale === 'ru' ? 'Отключено' : 'Disconnected'}
					{/if}
				</span>
			</div>
			
			<div class="space-y-3">
				<input
					type="text"
					bind:value={roomId}
					placeholder={i18n.locale === 'ru' ? 'Введите ID комнаты' : 'Enter Room ID'}
					onkeydown={(e) => e.key === 'Enter' && createOrJoinRoom()}
					class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition"
				/>
				
				<button
					onclick={createOrJoinRoom}
					class="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-lg font-medium transition shadow-md btn-hover-lift"
				>
					{i18n.locale === 'ru' ? 'Создать / Войти' : 'Create / Join'}
				</button>
				
				<button
					onclick={closeRoom}
					disabled={roomStatus === 'disconnected'}
					class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed btn-hover-lift"
				>
					{i18n.locale === 'ru' ? 'Закрыть комнату' : 'Close Room'}
				</button>
				
				<button
					onclick={() => showRoomsList = !showRoomsList}
					class="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition text-sm btn-hover-lift flex items-center justify-center gap-2"
				>
					<FolderOpen size={16} />
					{i18n.locale === 'ru' ? 'Показать комнаты' : 'Show Rooms'}
				</button>
			</div>
			
			{#if roomUrl}
				<div class="mt-3 text-sm p-3 bg-gray-50 rounded-lg webhook-url-container">
					<div class="font-semibold text-blue-800 mb-1">Webhook URL:</div>
					<div class="flex items-center justify-between gap-2">
						<code class="text-blue-600 break-all flex-1 text-xs">{roomUrl}</code>
						<button
							onclick={(e) => copyToClipboard(roomUrl, e)}
							class="copy-btn-inline text-blue-600 hover:text-blue-800 text-lg"
							title="Копировать URL"
						>
							📋
						</button>
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Statistics -->
		{#if roomId}
			<div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
				<h3 class="text-sm font-semibold text-blue-900 mb-2">
					{i18n.locale === 'ru' ? 'Статистика' : 'Statistics'}
				</h3>
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-blue-700">{i18n.locale === 'ru' ? 'Всего вебхуков:' : 'Total webhooks:'}</span>
						<span class="font-bold text-blue-900">{allHooks.length}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-blue-700">{i18n.locale === 'ru' ? 'Отображено:' : 'Displayed:'}</span>
						<span class="font-bold text-blue-900">{paginatedHooks.length}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-blue-700">{i18n.locale === 'ru' ? 'Текущая страница:' : 'Current page:'}</span>
						<span class="font-bold text-blue-900">{currentPage}</span>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Fake Error Simulation -->
		<div class="border border-gray-200 rounded-lg p-4">
			<h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
				<AlertCircle size={16} class="text-orange-600" />
				{i18n.locale === 'ru' ? 'Симуляция ошибок' : 'Error Simulation'}
			</h3>
			
			<label class="flex items-center gap-2 mb-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={fakeErrorEnabled}
					onchange={toggleFakeError}
					class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
				/>
				<span class="text-sm text-gray-700">
					{i18n.locale === 'ru' ? 'Включить симуляцию' : 'Enable simulation'}
				</span>
			</label>
			
			<input
				type="number"
				bind:value={fakeErrorCode}
				disabled={!fakeErrorEnabled}
				min="100"
				max="599"
				placeholder="HTTP код"
				class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
			/>
		</div>
		
		<!-- Sort -->
		<div class="border border-gray-200 rounded-lg p-4">
			<h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
				<RefreshCw size={16} />
				{i18n.locale === 'ru' ? 'Сортировка' : 'Sorting'}
			</h3>
			<select
				bind:value={sortOrder}
				class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
			>
				<option value="newest">{i18n.locale === 'ru' ? 'Новые первые' : 'Newest first'}</option>
				<option value="oldest">{i18n.locale === 'ru' ? 'Старые первые' : 'Oldest first'}</option>
			</select>
		</div>
		
		<!-- Action Buttons -->
		<div class="space-y-2">
			<button
				onclick={sendTestWebhook}
				class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm btn-hover-lift flex items-center justify-center gap-2"
			>
				<Send size={16} />
				{i18n.locale === 'ru' ? 'Отправить тест' : 'Send Test'}
			</button>
			
			<button
				onclick={exportWebhooks}
				class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm btn-hover-lift flex items-center justify-center gap-2"
			>
				<Download size={16} />
				{i18n.locale === 'ru' ? 'Экспорт JSON' : 'Export JSON'}
			</button>
			
			<button
				onclick={clearAllWebhooks}
				class="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-lg font-medium transition text-sm btn-hover-lift flex items-center justify-center gap-2"
			>
				<Trash2 size={16} />
				{i18n.locale === 'ru' ? 'Очистить все' : 'Clear All'}
			</button>
		</div>
	</aside>
	
	<!-- MAIN CONTENT -->
	<main class="flex-1 p-6 overflow-y-auto custom-scrollbar">
		<div class="max-w-6xl mx-auto">
			<!-- Search Bar -->
			<div class="bg-white p-4 rounded-lg shadow-md mb-6">
				<div class="flex gap-3 items-center">
					<div class="flex-1 relative">
						<input
							type="text"
							bind:value={searchTerm}
							placeholder={i18n.locale === 'ru' ? 'Поиск по содержимому...' : 'Search content...'}
							class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition"
						/>
						<Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
					</div>
					<select
						bind:value={itemsPerPage}
						onchange={() => currentPage = 1}
						class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
					>
						<option value={10}>10 / {i18n.locale === 'ru' ? 'страница' : 'page'}</option>
						<option value={25}>25 / {i18n.locale === 'ru' ? 'страница' : 'page'}</option>
						<option value={50}>50 / {i18n.locale === 'ru' ? 'страница' : 'page'}</option>
						<option value={100}>100 / {i18n.locale === 'ru' ? 'страница' : 'page'}</option>
					</select>
				</div>
			</div>
			
			<!-- Webhooks List -->
			<div class="bg-white rounded-lg shadow-md overflow-hidden">
				<div class="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
					<h2 class="text-xl font-semibold text-gray-900">
						{i18n.locale === 'ru' ? 'История вебхуков' : 'Webhooks History'}
					</h2>
				</div>
				
				<div class="p-4 space-y-4 min-h-[400px]">
					{#if loading}
						<div class="flex flex-col items-center justify-center py-16">
							<Loader2 size={48} class="text-green-600 animate-spin mb-4" />
							<p class="text-lg text-gray-400">{i18n.locale === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
						</div>
					{:else if paginatedHooks.length === 0}
						<div class="flex flex-col items-center justify-center py-16 text-gray-400">
							<Inbox size={64} class="mb-4" />
							<p class="text-lg">
								{searchTerm 
									? (i18n.locale === 'ru' ? 'Ничего не найдено' : 'Nothing found')
									: (i18n.locale === 'ru' ? 'Нет вебхуков для отображения' : 'No webhooks to display')
								}
							</p>
							<p class="text-sm mt-2">
								{searchTerm
									? (i18n.locale === 'ru' ? 'Попробуйте изменить запрос' : 'Try changing the query')
									: (i18n.locale === 'ru' ? 'Создайте комнату и отправьте первый вебхук' : 'Create a room and send your first webhook')
								}
							</p>
						</div>
					{:else}
						{#each paginatedHooks as hook (hook._id || hook.receiptId)}
							<div class="p-4 border border-gray-200 rounded-lg bg-white webhook-card fade-in">
								<div class="flex justify-between items-start mb-3">
									<div class="flex items-center gap-3">
										<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded">
											ID: {hook.receiptId || hook._id}
										</span>
										<span class="text-sm text-gray-500">
											{formatTimestamp(hook.timestamp)}
										</span>
									</div>
									<div class="flex gap-2">
										<button
											onclick={(e) => copyToClipboard(JSON.stringify(hook.body || hook, null, 2), e)}
											class="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition text-sm font-medium"
											title={i18n.locale === 'ru' ? 'Копировать весь объект' : 'Copy entire object'}
										>
											📋 {i18n.locale === 'ru' ? 'Копировать всё' : 'Copy All'}
										</button>
										<button
											onclick={() => deleteWebhook(hook._id || hook.receiptId)}
											class="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm font-medium"
											title={i18n.locale === 'ru' ? 'Удалить' : 'Delete'}
										>
											🗑️ {i18n.locale === 'ru' ? 'Удалить' : 'Delete'}
										</button>
									</div>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200 hover:bg-white transition">
									<pre class="text-sm font-mono">{@html syntaxHighlight(hook.body || hook)}</pre>
								</div>
								<div class="mt-2 text-xs text-gray-500 italic">
									💡 {i18n.locale === 'ru' ? 'Нажмите на любой ключ или значение, чтобы скопировать' : 'Click any key or value to copy'}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
			
			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="mt-6 flex items-center justify-between bg-white p-4 rounded-lg shadow-md">
					<button
						onclick={() => currentPage > 1 && currentPage--}
						disabled={currentPage === 1}
						class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed pagination-btn"
					>
						← {i18n.locale === 'ru' ? 'Назад' : 'Back'}
					</button>
					
					<div class="flex gap-2">
						{#each pageNumbers as page}
							{#if page === '...'}
								<span class="px-3 py-2 text-gray-400">...</span>
							{:else}
								<button
									onclick={() => currentPage = page}
									class="px-3 py-2 rounded-lg font-medium transition pagination-btn
										   {page === currentPage ? 'bg-green-600 text-white active' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
								>
									{page}
								</button>
							{/if}
						{/each}
					</div>
					
					<button
						onclick={() => currentPage < totalPages && currentPage++}
						disabled={currentPage === totalPages}
						class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed pagination-btn"
					>
						{i18n.locale === 'ru' ? 'Вперед' : 'Forward'} →
					</button>
				</div>
			{/if}
		</div>
	</main>
	
	<!-- RIGHT SIDEBAR - All Rooms -->
	{#if showRoomsList}
		<div class="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-50 slide-in-right">
			<div class="p-4 flex items-center justify-between border-b">
				<h3 class="text-lg font-semibold">
					{i18n.locale === 'ru' ? 'Все комнаты' : 'All Rooms'}
				</h3>
				<button onclick={() => showRoomsList = false} class="text-gray-500 hover:text-gray-700 text-xl">✕</button>
			</div>
			
			<div class="p-4 overflow-y-auto custom-scrollbar" style="height: calc(100% - 64px);">
				{#if loadingRooms}
					<div class="flex items-center justify-center py-8">
						<Loader2 size={32} class="text-green-600 animate-spin" />
					</div>
				{:else if rooms.length === 0}
					<p class="text-center text-gray-500 py-6">
						{i18n.locale === 'ru' ? 'Нет комнат' : 'No rooms'}
					</p>
				{:else}
					<div class="space-y-2">
						{#each rooms as room}
							<div class="border rounded-lg p-3 room-card cursor-pointer" onclick={() => openRoom(room.roomId)}>
								<div class="font-semibold text-gray-800 mb-1">{room.roomId}</div>
								<div class="text-xs text-gray-500">
									{i18n.locale === 'ru' ? 'Вебхуков:' : 'Webhooks:'} {room.webhookCount || 0}
								</div>
								<button
									onclick={() => openRoom(room.roomId)}
									class="mt-2 w-full bg-green-600 hover:bg-green-700 text-white py-1 rounded text-xs font-semibold btn-hover-lift"
								>
									{i18n.locale === 'ru' ? 'Открыть' : 'Open'}
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
