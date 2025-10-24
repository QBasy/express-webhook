(function() {
    const apiBase = window.location.origin;
    const token = localStorage.getItem('jwt_token');
    const currentPage = window.location.pathname;

    // Страницы, которые доступны без авторизации
    const publicPages = ['/login.html', '/register.html'];
    const isPublicPage = publicPages.includes(currentPage);

    // Если нет токена и страница не публичная - редирект на логин
    if (!token && !isPublicPage) {
        console.log('❌ No token, redirecting to login');
        window.location.href = '/login.html';
        return;
    }

    // Если есть токен и мы на публичной странице - редирект на главную
    if (token && isPublicPage) {
        console.log('✅ Already logged in, redirecting to home');
        window.location.href = '/';
        return;
    }

    // Если есть токен и мы НЕ на публичной странице - проверяем токен
    if (token && !isPublicPage) {
        console.log('🔍 Checking token validity...');

        fetch(`${apiBase}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                console.log('📡 Auth check response:', res.status);

                if (!res.ok) {
                    // Токен невалиден
                    console.log('❌ Token invalid, clearing and redirecting');
                    localStorage.removeItem('jwt_token');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                    return null;
                }

                return res.json();
            })
            .then(userData => {
                if (userData) {
                    console.log('✅ Token valid, user:', userData.username);

                    // Сохраняем обновленные данные пользователя
                    localStorage.setItem('user', JSON.stringify(userData));

                    // Обновляем UI если есть элементы
                    updateUserInfo(userData);
                }
            })
            .catch(err => {
                console.error('❌ Auth check failed:', err);
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            });
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

        // Если 401 - токен протух, выходим
        if (response.status === 401) {
            console.log('❌ 401 Unauthorized, logging out');
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        }

        return response;
    };

    // Функция выхода
    window.logout = function() {
        console.log('👋 Logging out');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    };

    // Получить заголовки авторизации
    window.getAuthHeaders = function() {
        const token = localStorage.getItem('jwt_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };
})();