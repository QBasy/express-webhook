<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$stores/auth.svelte';
	import { i18n } from '$stores/i18n.svelte';
	import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-svelte';
	
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let reason = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	
	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (password !== confirmPassword) {
			error = i18n.locale === 'ru' ? 'Пароли не совпадают' : 'Passwords do not match';
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			const result = await authState.register(username, email, password, reason);
			success = result.message;
			
			setTimeout(() => goto('/login'), 3000);
			
		} catch (e: any) {
			error = e.message || 'Registration failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen gradient-green-bg flex items-center justify-center p-4 py-20">
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
		<div class="text-center mb-6">
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-800">{i18n.t('auth.registerTitle')}</h1>
			<p class="text-green-600 font-semibold mt-2 text-sm">GREEN-API QA TEAM</p>
		</div>

		{#if error}
			<div class="mb-4 p-4 rounded-lg bg-red-100 text-red-800 border border-red-300 flex items-start gap-2">
				<AlertCircle size={20} class="flex-shrink-0 mt-0.5" />
				<span class="text-sm">{error}</span>
			</div>
		{/if}

		{#if success}
			<div class="mb-4 p-4 rounded-lg bg-green-100 text-green-800 border border-green-300 flex items-start gap-2">
				<CheckCircle size={20} class="flex-shrink-0 mt-0.5" />
				<span class="text-sm">{success}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
					<User size={16} />
					{i18n.t('auth.username')}
				</label>
				<input
					type="text"
					bind:value={username}
					required
					minlength="3"
					class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm sm:text-base"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
					<Mail size={16} />
					{i18n.t('auth.email')}
				</label>
				<input
					type="email"
					bind:value={email}
					required
					class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm sm:text-base"
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
					minlength="6"
					class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm sm:text-base"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
					<Lock size={16} />
					{i18n.t('auth.confirmPassword')}
				</label>
				<input
					type="password"
					bind:value={confirmPassword}
					required
					minlength="6"
					class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm sm:text-base"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					{i18n.t('auth.reason')} ({i18n.locale === 'ru' ? 'опционально' : 'optional'})
				</label>
				<textarea
					bind:value={reason}
					rows="3"
					class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none text-sm sm:text-base"
					placeholder={i18n.t('auth.reasonPlaceholder')}
				></textarea>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
			>
				{loading ? '...' : i18n.t('auth.registerButton')}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-sm text-gray-600">
				{i18n.t('auth.hasAccount')}
				<a href="/login" class="text-green-600 hover:text-green-800 font-semibold">
					{i18n.t('nav.login')}
				</a>
			</p>
		</div>
	</div>
</div>

<style>
	.gradient-green-bg {
		background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
	}
</style>
