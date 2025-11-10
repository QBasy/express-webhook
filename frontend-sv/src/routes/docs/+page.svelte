<script lang="ts">
    import { Code, Book, Send, Key, Lock, CheckCircle } from 'lucide-svelte';
    import { browser } from '$app/environment';

    let baseUrl = $state('');

    $effect(() => {
        if (browser) {
            baseUrl = window.location.origin;
        }
    });
</script>

<svelte:head>
    <title>Документация - Webhook Viewer</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-800 flex items-center gap-3">
            <Book size={36} class="text-green-600" />
            <span>Документация API</span>
        </h1>
        <p class="text-gray-600 mt-3 text-lg">Полное руководство по использованию Webhook Viewer API</p>
    </div>

    <div class="space-y-8">
        <section class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Key size={24} class="text-green-600" />
                <span>Аутентификация</span>
            </h2>

            <div class="space-y-4">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <p class="text-sm text-blue-800">
                        <strong>Важно:</strong> Для доступа к защищенным эндпоинтам необходимо передавать JWT токен в заголовке Authorization.
                    </p>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">POST /auth/register</h3>
                    <p class="text-sm text-gray-600 mb-3">Регистрация нового пользователя</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>{`{
  "username": "string",
  "password": "string"
}`}</code></pre>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                        <strong>Ответ:</strong> После регистрации пользователь получает статус "pending" и должен ждать одобрения администратора.
                    </p>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">POST /auth/login</h3>
                    <p class="text-sm text-gray-600 mb-3">Вход в систему</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>{`{
  "username": "string",
  "password": "string"
}`}</code></pre>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                        <strong>Ответ:</strong>
                    </p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto mt-2">
                        <pre class="text-green-400 text-sm"><code>{`{
  "token": "jwt_token_here",
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin | user",
    "status": "active | pending | rejected"
  }
}`}</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">GET /auth/me</h3>
                    <p class="text-sm text-gray-600 mb-3">Получить информацию о текущем пользователе</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;token&gt;</code></pre>
                    </div>
                </div>
            </div>
        </section>

        <section class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Lock size={24} class="text-purple-600" />
                <span>Управление пользователями (Только для администраторов)</span>
            </h2>

            <div class="space-y-4">
                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">GET /auth/users</h3>
                    <p class="text-sm text-gray-600 mb-3">Получить список всех пользователей</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;admin_token&gt;</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">POST /auth/users/:userId/approve</h3>
                    <p class="text-sm text-gray-600 mb-3">Одобрить пользователя</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;admin_token&gt;</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">POST /auth/users/:userId/reject</h3>
                    <p class="text-sm text-gray-600 mb-3">Отклонить пользователя</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;admin_token&gt;</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">DELETE /auth/users/:userId</h3>
                    <p class="text-sm text-gray-600 mb-3">Удалить пользователя</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;admin_token&gt;</code></pre>
                    </div>
                </div>
            </div>
        </section>

        <section class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Code size={24} class="text-green-600" />
                <span>Работа с комнатами</span>
            </h2>

            <div class="space-y-4">
                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">GET /room/list</h3>
                    <p class="text-sm text-gray-600 mb-3">Получить список комнат пользователя</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;token&gt;</code></pre>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                        <strong>Ответ:</strong>
                    </p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto mt-2">
                        <pre class="text-green-400 text-sm"><code>{`{
  "rooms": [
    {
      "id": "string",
      "name": "string",
      "createdAt": "ISO8601",
      "userId": "string"
    }
  ]
}`}</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">POST /room/create</h3>
                    <p class="text-sm text-gray-600 mb-3">Создать новую комнату</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>{`Authorization: Bearer <token>

{
  "name": "string"
}`}</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">DELETE /room/:roomId</h3>
                    <p class="text-sm text-gray-600 mb-3">Удалить комнату</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;token&gt;</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">GET /room/:roomId/webhooks</h3>
                    <p class="text-sm text-gray-600 mb-3">Получить вебхуки комнаты</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;token&gt;</code></pre>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                        <strong>Ответ:</strong>
                    </p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto mt-2">
                        <pre class="text-green-400 text-sm"><code>{`{
  "webhooks": [
    {
      "id": "string",
      "roomId": "string",
      "payload": {},
      "receivedAt": "ISO8601"
    }
  ]
}`}</code></pre>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">POST /room/:roomId/clear</h3>
                    <p class="text-sm text-gray-600 mb-3">Очистить все вебхуки комнаты</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>Authorization: Bearer &lt;token&gt;</code></pre>
                    </div>
                </div>
            </div>
        </section>

        <section class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Send size={24} class="text-blue-600" />
                <span>Отправка вебхуков</span>
            </h2>

            <div class="space-y-4">
                <div class="bg-green-50 border-l-4 border-green-500 p-4">
                    <p class="text-sm text-green-800">
                        <strong>Публичный эндпоинт:</strong> Для отправки вебхуков авторизация не требуется.
                    </p>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-800 mb-2">POST /hook/:roomId</h3>
                    <p class="text-sm text-gray-600 mb-3">Отправить вебхук в комнату</p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-green-400 text-sm"><code>{`POST ${baseUrl}/hook/{roomId}
Content-Type: application/json

{
  "any": "json",
  "data": "here",
  "nested": {
    "objects": "supported"
  }
}`}</code></pre>
                    </div>
                    <p class="text-sm text-gray-600 mt-3">
                        <strong>Пример с cURL:</strong>
                    </p>
                    <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto mt-2">
                        <pre class="text-green-400 text-sm"><code>{`curl -X POST ${baseUrl}/hook/{roomId} \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello World", "timestamp": "2025-01-01T00:00:00Z"}'`}</code></pre>
                    </div>
                </div>
            </div>
        </section>

        <section class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle size={24} class="text-green-600" />
                <span>Быстрый старт</span>
            </h2>

            <div class="space-y-4">
                <div class="space-y-3">
                    <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">1</div>
                        <div>
                            <p class="font-medium text-gray-800">Зарегистрируйтесь</p>
                            <p class="text-sm text-gray-600">Создайте аккаунт и дождитесь одобрения администратором</p>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">2</div>
                        <div>
                            <p class="font-medium text-gray-800">Войдите в систему</p>
                            <p class="text-sm text-gray-600">Получите JWT токен для доступа к API</p>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">3</div>
                        <div>
                            <p class="font-medium text-gray-800">Создайте комнату</p>
                            <p class="text-sm text-gray-600">Создайте комнату для получения вебхуков</p>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">4</div>
                        <div>
                            <p class="font-medium text-gray-800">Отправьте вебхук</p>
                            <p class="text-sm text-gray-600">Используйте полученный URL для отправки POST запросов</p>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">5</div>
                        <div>
                            <p class="font-medium text-gray-800">Просматривайте результаты</p>
                            <p class="text-sm text-gray-600">Все вебхуки отображаются в реальном времени</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-green-900 mb-2">Нужна помощь?</h3>
            <p class="text-sm text-green-800 mb-4">
                Если у вас возникли вопросы или проблемы, используйте страницу "Тестер" для проверки работы API или свяжитесь с администратором.
            </p>
            <div class="flex gap-3">
                <a href="/tester" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium">
                    Перейти к тестеру
                </a>
                <a href="https://green-api.com" target="_blank" class="px-4 py-2 bg-white hover:bg-gray-50 text-green-700 border border-green-300 rounded-lg transition text-sm font-medium">
                    GREEN-API
                </a>
            </div>
        </section>
    </div>
</div>