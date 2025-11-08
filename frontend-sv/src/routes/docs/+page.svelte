<script lang="ts">
	import { onMount } from 'svelte';
	import { Book, Home, ExternalLink } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Документация - Webhook Viewer | GREEN-API QA TEAM</title>
</svelte:head>

<div class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
	<!-- Header -->
	<header class="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
		<div class="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
						<rect width="100" height="100" rx="12" fill="#3B9702"/>
						<text x="50" y="70" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">G</text>
					</svg>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Webhook Viewer API</h1>
						<p class="text-xs text-green-600 font-semibold">Documentation</p>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<a href="/" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition">
						← Viewer
					</a>
					<a href="https://green-api.com" target="_blank" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
						GREEN-API →
					</a>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
		<!-- Introduction -->
		<section class="bg-white rounded-lg shadow-md p-8 mb-8 animate-fade-in">
			<h2 class="text-3xl font-bold text-gray-900 mb-4">Добро пожаловать в Webhook Viewer API</h2>
			<p class="text-gray-700 mb-4 text-lg">
				Webhook Viewer — это инструмент для тестирования и отладки webhook'ов, созданный командой <span class="text-green-600 font-semibold">GREEN-API QA TEAM</span>.
			</p>
			<p class="text-gray-600 mb-6">
				С помощью этого API вы можете создавать временные комнаты для приема webhook'ов, просматривать их содержимое, симулировать ошибки и управлять данными.
			</p>

			<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
				<h3 class="font-semibold text-blue-900 mb-2">🚀 Быстрый старт</h3>
				<ol class="list-decimal list-inside text-blue-800 space-y-2">
					<li>Создайте комнату через POST запрос на <code class="bg-blue-100 px-2 py-1 rounded">/room/&#123;id&#125;</code></li>
					<li>Получите URL для приема webhook'ов</li>
					<li>Отправляйте webhook'ы на полученный URL</li>
					<li>Просматривайте результаты через GET запрос на <code class="bg-blue-100 px-2 py-1 rounded">/hook/&#123;id&#125;</code></li>
				</ol>
			</div>
		</section>

		<!-- Room Management -->
		<section class="bg-white rounded-lg shadow-md p-8 mb-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">🏠 Управление комнатами</h2>

			<!-- Create Room -->
			<div class="mb-8 border-b pb-8">
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">POST</span>
					<code class="text-lg font-mono text-gray-800">/room/&#123;id&#125;</code>
				</div>
				<p class="text-gray-600 mb-4">Создает новую комнату для приема webhook'ов.</p>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl -X POST http://localhost:6005/room/my-test-room \
  -H "Authorization: Bearer YOUR_TOKEN"</code></pre>
				</div>

				<div class="mt-4 bg-green-50 p-4 rounded-lg">
					<p class="text-sm font-semibold text-green-900 mb-2">✓ Response 200:</p>
					<pre class="text-sm text-green-800"><code>&#123;
  "message": "Room created",
  "roomId": "my-test-room",
  "webhookUrl": "http://localhost:6005/hook/my-test-room"
&#125;</code></pre>
				</div>
			</div>

			<!-- Delete Room -->
			<div class="mb-8">
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold">DELETE</span>
					<code class="text-lg font-mono text-gray-800">/room/&#123;id&#125;</code>
				</div>
				<p class="text-gray-600 mb-4">Удаляет комнату и все связанные webhook'и.</p>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl -X DELETE http://localhost:6005/room/my-test-room \
  -H "Authorization: Bearer YOUR_TOKEN"</code></pre>
				</div>
			</div>
		</section>

		<!-- Webhooks -->
		<section class="bg-white rounded-lg shadow-md p-8 mb-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">📨 Работа с Webhook'ами</h2>

			<!-- Send Webhook -->
			<div class="mb-8 border-b pb-8">
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">POST</span>
					<code class="text-lg font-mono text-gray-800">/hook/&#123;roomId&#125;</code>
				</div>
				<p class="text-gray-600 mb-4">Отправляет webhook в комнату.</p>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl -X POST http://localhost:6005/hook/my-test-room \
  -H "Content-Type: application/json" \
  -d '&#123;"message": "Hello World", "timestamp": "2025-01-01T00:00:00Z"&#125;'</code></pre>
				</div>
			</div>

			<!-- Get All Webhooks -->
			<div class="mb-8 border-b pb-8">
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold">GET</span>
					<code class="text-lg font-mono text-gray-800">/hook/all/&#123;roomId&#125;</code>
				</div>
				<p class="text-gray-600 mb-4">Получает все webhook'и из комнаты.</p>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl http://localhost:6005/hook/all/my-test-room \
  -H "Authorization: Bearer YOUR_TOKEN"</code></pre>
				</div>
			</div>

			<!-- Delete Webhooks -->
			<div class="mb-8">
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold">DELETE</span>
					<code class="text-lg font-mono text-gray-800">/hook/delete/&#123;roomId&#125;</code>
				</div>
				<p class="text-gray-600 mb-4">Удаляет все webhook'и из комнаты.</p>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl -X DELETE http://localhost:6005/hook/delete/my-test-room \
  -H "Authorization: Bearer YOUR_TOKEN"</code></pre>
				</div>
			</div>
		</section>

		<!-- Fake Errors -->
		<section class="bg-white rounded-lg shadow-md p-8 mb-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">⚠️ Симуляция ошибок</h2>

			<div class="mb-8">
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">POST</span>
					<code class="text-lg font-mono text-gray-800">/room/&#123;id&#125;/fake-error</code>
				</div>
				<p class="text-gray-600 mb-4">Включает симуляцию HTTP ошибок для webhook'ов.</p>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl -X POST http://localhost:6005/room/my-test-room/fake-error \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '&#123;"enabled": true, "statusCode": 500&#125;'</code></pre>
				</div>

				<div class="mt-4 bg-yellow-50 p-4 rounded-lg">
					<p class="text-sm text-yellow-900">
						<strong>Примечание:</strong> После включения симуляции, все webhook'и будут возвращать указанный HTTP код.
					</p>
				</div>
			</div>
		</section>

		<!-- Auth -->
		<section class="bg-white rounded-lg shadow-md p-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">🔐 Авторизация</h2>

			<div class="mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-3">Регистрация</h3>
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">POST</span>
					<code class="text-lg font-mono text-gray-800">/auth/register</code>
				</div>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl -X POST http://localhost:6005/auth/register \
  -H "Content-Type: application/json" \
  -d '&#123;"username": "user", "password": "pass"&#125;'</code></pre>
				</div>
			</div>

			<div class="mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-3">Вход</h3>
				<div class="flex items-center gap-3 mb-4">
					<span class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">POST</span>
					<code class="text-lg font-mono text-gray-800">/auth/login</code>
				</div>
				
				<div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
					<pre class="text-sm"><code>curl -X POST http://localhost:6005/auth/login \
  -H "Content-Type: application/json" \
  -d '&#123;"username": "user", "password": "pass"&#125;'</code></pre>
				</div>

				<div class="mt-4 bg-green-50 p-4 rounded-lg">
					<p class="text-sm font-semibold text-green-900 mb-2">✓ Response:</p>
					<pre class="text-sm text-green-800"><code>&#123;
  "token": "eyJhbGci...",
  "user": &#123;
    "username": "user",
    "role": "user"
  &#125;
&#125;</code></pre>
				</div>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="bg-white border-t border-gray-200 mt-8">
		<div class="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
			<div class="text-center text-gray-600">
				<p class="mb-2">
					<span class="text-green-600 font-semibold">GREEN-API QA TEAM</span> © 2025
				</p>
				<div class="flex items-center justify-center gap-4 text-sm">
					<a href="/" class="hover:text-green-600 transition">Главная</a>
					<span>|</span>
					<a href="https://green-api.com" target="_blank" class="hover:text-green-600 transition">GREEN-API</a>
				</div>
			</div>
		</div>
	</footer>
</div>
