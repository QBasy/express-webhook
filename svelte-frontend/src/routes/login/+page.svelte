<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$stores/auth.svelte';
	import { i18n } from '$stores/i18n.svelte';
	import { User, Lock, AlertCircle, CheckCircle } from 'lucide-svelte';
	
	let username = $state('admin');
	let password = $state('admin');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	
	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!username || !password) {
			error = i18n.locale === 'ru' ? 'Заполните все поля' : 'Fill all fields';
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			await authState.login(username, password);
			success = i18n.locale === 'ru' ? 'Успешный вход!' : 'Login successful!';
			
			setTimeout(() => {
				goto(authState.isAdmin ? '/admin' : '/');
			}, 500);
			
		} catch (e: any) {
			error = e.message || 'Login failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen gradient-green-bg flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fade-in">
		<div class="text-center mb-6 sm:mb-8">
			<div class="mx-auto mb-4 w-20 sm:w-24 animate-float">
				<svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
					<rect width="100" height="100" rx="12" fill="#3B9702"/>
					<text x="50" y="70" font-family="Arial" font-size="60" font-weight="bold" fill="white" text-anchor="middle">G</text>
				</svg>
			</div>
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-800">Webhook Viewer</h1>
			<p class="text-green-600 font-semibold mt-2 tracking-wide text-sm">GREEN-API QA TEAM</p>
			<p class="text-gray-500 mt-2 text-sm">{i18n.t('auth.loginTitle')}</p>
		</div>

		{#if error}
			<div class="mb-4 p-3 sm:p-4 rounded-lg bg-red-100 text-red-800 border border-red-300 flex items-start gap-2 text-sm">
				<AlertCircle size={20} class="flex-shrink-0 mt-0.5" />
				<span>{error}</span>
			</div>
		{/if}

		{#if success}
			<div class="mb-4 p-3 sm:p-4 rounded-lg bg-green-100 text-green-800 border border-green-300 flex items-start gap-2 text-sm">
				<CheckCircle size={20} class="flex-shrink-0 mt-0.5" />
				<span>{success}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-5">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
					<User size={16} />
					{i18n.t('auth.username')}
				</label>
				<input
					type="text"
					bind:value={username}
					required
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition text-sm sm:text-base"
					placeholder={i18n.locale === 'ru' ? 'Введите имя пользователя' : 'Enter username'}
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
					<Lock size={16} />
					{i18n.t('auth.password')}
				</label>
				<input
					type="password"
					bind:value={password}
					required
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition text-sm sm:text-base"
					placeholder={i18n.locale === 'ru' ? 'Введите пароль' : 'Enter password'}
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
			>
				{loading ? '...' : i18n.t('auth.loginButton')}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-sm text-gray-600">
				{i18n.t('auth.noAccount')}
				<a href="/register" class="text-green-600 hover:text-green-800 font-semibold transition">
					{i18n.t('auth.registerButton')}
				</a>
			</p>
		</div>

		<div class="mt-8 pt-6 border-t border-gray-200 text-center">
			<a href="https://green-api.com" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold transition text-sm">
				<span>GREEN-API</span>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
				</svg>
			</a>
			<p class="text-xs text-gray-500 mt-2">© 2025 Webhook Viewer</p>
		</div>
	</div>
</div>

<style>
	.gradient-green-bg {
		background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
	}
	
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-20px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	.animate-fade-in {
		animation: fadeIn 0.5s ease-out;
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-10px); }
	}
	
	.animate-float {
		animation: float 3s ease-in-out infinite;
	}
</style>
