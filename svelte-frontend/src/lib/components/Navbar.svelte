<script lang="ts">
	import { authState } from '$stores/auth.svelte';
	import { i18n } from '$stores/i18n.svelte';
	import { goto } from '$app/navigation';
	import { 
		Home, 
		FlaskConical, 
		BookOpen, 
		Crown, 
		LogOut, 
		Menu, 
		X,
		Globe,
		ChevronDown
	} from 'lucide-svelte';
	
	let dropdownOpen = $state(false);
	let mobileMenuOpen = $state(false);
	
	async function handleLogout() {
		if (!confirm(i18n.t('nav.logout') + '?')) return;
		
		await fetch('/api/auth/logout', { method: 'POST' });
		authState.logout();
		goto('/login');
	}
	
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Element;
			if (dropdownOpen && !target.closest('.dropdown-container')) {
				dropdownOpen = false;
			}
		}
		
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<header class="bg-white shadow-md border-b-2 border-green-500 sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between">
			<a href="/" class="flex items-center gap-2 sm:gap-4 hover:opacity-90 transition-opacity">
				<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="sm:w-[50px] sm:h-[50px]">
					<rect width="100" height="100" rx="12" fill="#3B9702"/>
					<text x="50" y="70" font-family="Arial" font-size="60" font-weight="bold" fill="white" text-anchor="middle">G</text>
				</svg>
				<div class="hidden sm:block">
					<h1 class="text-lg sm:text-2xl font-bold text-gray-900">Webhook Viewer</h1>
					<p class="text-xs text-green-600 font-semibold tracking-wide">GREEN-API QA TEAM</p>
				</div>
			</a>
			
			<div class="flex items-center gap-2 sm:gap-4">
				<button
					onclick={() => i18n.toggleLocale()}
					class="p-2 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
					title={i18n.t('common.language')}
				>
					<Globe size={18} class="text-gray-600" />
					<span class="hidden sm:inline text-gray-700 font-medium text-sm">{i18n.locale.toUpperCase()}</span>
				</button>
				
				{#if authState.isAuthenticated}
					<nav class="hidden lg:flex items-center gap-2">
						<a href="/" class="flex items-center gap-2 font-medium text-gray-700 hover:text-green-600 transition px-3 py-2 rounded-lg hover:bg-green-50">
							<Home size={18} />
							<span class="text-sm">{i18n.t('nav.home')}</span>
						</a>
						<a href="/tester" class="flex items-center gap-2 font-medium text-gray-700 hover:text-green-600 transition px-3 py-2 rounded-lg hover:bg-green-50">
							<FlaskConical size={18} />
							<span class="text-sm">{i18n.t('nav.tester')}</span>
						</a>
						<a href="/docs" class="flex items-center gap-2 font-medium text-gray-700 hover:text-green-600 transition px-3 py-2 rounded-lg hover:bg-green-50">
							<BookOpen size={18} />
							<span class="text-sm">{i18n.t('nav.docs')}</span>
						</a>
						{#if authState.isAdmin}
							<a href="/admin" class="flex items-center gap-2 font-medium text-purple-600 hover:text-purple-800 transition px-3 py-2 rounded-lg hover:bg-purple-50">
								<Crown size={18} />
								<span class="text-sm">{i18n.t('nav.admin')}</span>
							</a>
						{/if}
					</nav>
					
					<button
						onclick={() => mobileMenuOpen = !mobileMenuOpen}
						class="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
					>
						{#if mobileMenuOpen}
							<X size={24} class="text-gray-600" />
						{:else}
							<Menu size={24} class="text-gray-600" />
						{/if}
					</button>
					
					<div class="dropdown-container relative hidden lg:block">
						<button
							onclick={() => dropdownOpen = !dropdownOpen}
							class="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg transition border border-green-200"
						>
							<div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
								{authState.user?.username.charAt(0).toUpperCase()}
							</div>
							<div class="text-left hidden xl:block">
								<div class="text-sm font-semibold text-gray-800">{authState.user?.username}</div>
								<div class="text-xs text-green-600">{authState.isAdmin ? '👑 Admin' : '👤 User'}</div>
							</div>
							<ChevronDown size={16} class="text-gray-600 transition-transform {dropdownOpen ? 'rotate-180' : ''}" />
						</button>
						
						{#if dropdownOpen}
							<div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-50">
								<div class="py-2">
									<div class="px-4 py-3 border-b">
										<div class="font-semibold text-gray-900">{authState.user?.username}</div>
										<div class="text-xs text-gray-500">{authState.user?.email}</div>
									</div>
									
									<a href="/" onclick={() => dropdownOpen = false} class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
										<Home size={16} /> {i18n.t('nav.home')}
									</a>
									<a href="/tester" onclick={() => dropdownOpen = false} class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
										<FlaskConical size={16} /> {i18n.t('nav.tester')}
									</a>
									<a href="/docs" onclick={() => dropdownOpen = false} class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
										<BookOpen size={16} /> {i18n.t('nav.docs')}
									</a>
									{#if authState.isAdmin}
										<a href="/admin" onclick={() => dropdownOpen = false} class="flex items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 font-medium">
											<Crown size={16} /> {i18n.t('nav.admin')}
										</a>
									{/if}
									
									<div class="border-t mt-2 pt-2">
										<button onclick={handleLogout} class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">
											<LogOut size={16} /> {i18n.t('nav.logout')}
										</button>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<a href="/login" class="px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition text-sm">
						{i18n.t('nav.login')}
					</a>
				{/if}
			</div>
		</div>
		
		{#if mobileMenuOpen && authState.isAuthenticated}
			<div class="lg:hidden mt-4 pb-2 border-t pt-4 space-y-2">
				<a href="/" onclick={() => mobileMenuOpen = false} class="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 rounded-lg">
					<Home size={20} />
					<span class="font-medium">{i18n.t('nav.home')}</span>
				</a>
				<a href="/tester" onclick={() => mobileMenuOpen = false} class="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 rounded-lg">
					<FlaskConical size={20} />
					<span class="font-medium">{i18n.t('nav.tester')}</span>
				</a>
				<a href="/docs" onclick={() => mobileMenuOpen = false} class="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 rounded-lg">
					<BookOpen size={20} />
					<span class="font-medium">{i18n.t('nav.docs')}</span>
				</a>
				{#if authState.isAdmin}
					<a href="/admin" onclick={() => mobileMenuOpen = false} class="flex items-center gap-3 px-4 py-3 text-purple-600 hover:bg-purple-50 rounded-lg">
						<Crown size={20} />
						<span class="font-medium">{i18n.t('nav.admin')}</span>
					</a>
				{/if}
				
				<div class="border-t pt-2 mt-2">
					<div class="px-4 py-2 text-sm text-gray-600">
						<div class="font-semibold text-gray-900">{authState.user?.username}</div>
						<div class="text-xs">{authState.user?.email}</div>
					</div>
					<button onclick={handleLogout} class="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium">
						<LogOut size={20} />
						<span>{i18n.t('nav.logout')}</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</header>
