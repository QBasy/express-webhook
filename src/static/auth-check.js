// auth-check.js - Проверка авторизации БЕЗ бесконечной проверки
(function() {
    const apiBase = window.location.origin;
    const token = localStorage.getItem('jwt_token');
    const currentPage = window.location.pathname;

    console.log('🔍 Auth check started');
    console.log('📍 Current page:', currentPage);
    console.log('🔑 Has token:', !!token);

    // Страницы, которые доступны без авторизации
    const publicPages = ['/login.html', '/login', '/register.html', '/register', '/health'];
    const isPublicPage = publicPages.some(page => currentPage === page || currentPage.startsWith(page));

    // КРИТИЧНО: Если нет токена и страница не публичная - редирект ОДИН РАЗ
    if (!token && !isPublicPage) {
        console.log('❌ No token, redirecting to login (ONCE)');

        // Проверяем что мы уже не на странице логина
        if (!currentPage.includes('login')) {
            window.location.replace('/login.html'); // replace вместо href!
        }
        return;
    }

    // Если есть токен и мы на публичной странице - редирект на главную ОДИН РАЗ
    if (token && (currentPage === '/login.html' || currentPage === '/login' || currentPage === '/register.html' || currentPage === '/register')) {
        console.log('✅ Already logged in, redirecting to home (ONCE)');
        window.location.replace('/'); // replace вместо href!
        return;
    }

    // Если есть токен и мы НЕ на публичной странице - проверяем токен ОДИН РАЗ
    if (token && !isPublicPage) {
        console.log('🔍 Checking token validity (ONCE)...');

        // Функция для проверки авторизации
        window.checkAuth = async function() {
            try {
                const res = await fetch(`${apiBase}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                console.log('📡 Auth check response:', res.status);

                if (!res.ok) {
                    console.log('❌ Token invalid, clearing and redirecting');
                    localStorage.removeItem('jwt_token');
                    localStorage.removeItem('user');

                    // Только если не на странице логина
                    if (!window.location.pathname.includes('login')) {
                        window.location.replace('/login.html');
                    }
                    return false;
                }

                const userData = await res.json();
                console.log('✅ Token valid, user:', userData.username);

                // Сохраняем обновленные данные пользователя
                localStorage.setItem('user', JSON.stringify(userData));

                // Обновляем UI
                updateUserInfo(userData);

                return true;

            } catch (err) {
                console.error('❌ Auth check failed:', err);
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user');

                // Только если не на странице логина
                if (!window.location.pathname.includes('login')) {
                    window.location.replace('/login.html');
                }
                return false;
            }
        };

        // Запускаем проверку ТОЛЬКО ОДИН РАЗ при загрузке
        checkAuth();
    }

    function updateUserInfo(user) {
        // Обновляем имя пользователя
        const userNameEl = document.getElementById('current-user-name');
        if (userNameEl) {
            userNameEl.textContent = user.username;
        }

        // Обновляем роль
        const userRoleEl = document.getElementById('current-user-role');
        if (userRoleEl) {
            userRoleEl.textContent = user.role === 'admin' ? '👑 Admin' : '👤 User';
        }

        // Показываем ссылку на админку для админов
        if (user.role === 'admin') {
            const adminLinkContainer = document.getElementById('admin-link-container');
            if (adminLinkContainer) {
                adminLinkContainer.innerHTML = `
                    <a href="/admin.html" class="text-purple-600 hover:text-purple-800 font-medium">
                        👑 Админ панель
                    </a>
                `;
            }
        }
    }

    // Утилита для запросов с авторизацией
    window.fetchWithAuth = async function(url, options = {}) {
        const token = localStorage.getItem('jwt_token');

        if (!options.headers) {
            options.headers = {};
        }

        // Добавляем токен ко всем запросам кроме вебхуков
        if (token && !url.includes('/hook/')) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, options);

        // Если 401 - токен протух, выходим (БЕЗ бесконечного цикла)
        if (response.status === 401 && !window.location.pathname.includes('login')) {
            console.log('❌ 401 Unauthorized, logging out (ONCE)');
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user');
            window.location.replace('/login.html'); // replace!
        }

        return response;
    };

    // Функция выхода
    window.logout = function() {
        console.log('👋 Logging out');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        window.location.replace('/login.html'); // replace!
    };

    // Получить заголовки авторизации
    window.getAuthHeaders = function() {
        const token = localStorage.getItem('jwt_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    console.log('✅ Auth check completed');
})();