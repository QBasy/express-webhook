(function() {
    const apiBase = window.location.origin;
    const token = localStorage.getItem('jwt_token');
    const currentPage = window.location.pathname;

    console.log('🔍 Auth check started');
    console.log('📍 Current page:', currentPage);
    console.log('🔑 Has token:', !!token);

    const publicPages = ['/login.html', '/login', '/register.html', '/register', '/health', '/docs'];
    const isPublicPage = publicPages.some(page =>
        currentPage === page || currentPage.startsWith(page)
    );

    if (!token && !isPublicPage) {
        console.log('❌ No token on private page, redirecting to login');
        if (!currentPage.includes('login')) {
            window.location.replace('/login.html');
        }
        return;
    }

    if (token && (currentPage === '/login.html' || currentPage === '/login' ||
        currentPage === '/register.html' || currentPage === '/register')) {
        console.log('✅ Already logged in, redirecting to home');
        window.location.replace('/');
        return;
    }

    if (token && !isPublicPage) {
        console.log('🔍 Verifying token...');
        verifyToken();
    }

    async function verifyToken() {
        try {
            const res = await fetch(`${apiBase}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                console.log('❌ Token invalid (status:', res.status, ')');
                handleInvalidToken();
                return;
            }

            const userData = await res.json();
            console.log('✅ Token valid, user:', userData.username);

            localStorage.setItem('user', JSON.stringify(userData));

            if (typeof window.updateUserInfo === 'function') {
                window.updateUserInfo(userData);
            }

        } catch (err) {
            console.error('❌ Token verification failed:', err);
            handleInvalidToken();
        }
    }

    function handleInvalidToken() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');

        if (!window.location.pathname.includes('login')) {
            window.location.replace('/login.html');
        }
    }

    window.fetchWithAuth = async function(url, options = {}) {
        const token = localStorage.getItem('jwt_token');

        if (!options.headers) {
            options.headers = {};
        }

        if (token && !url.includes('/hook/')) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, options);

            if (response.status === 401 && !window.location.pathname.includes('login')) {
                console.log('❌ 401 Unauthorized, clearing token');
                handleInvalidToken();
            }

            return response;
        } catch (error) {
            console.error('❌ Fetch error:', error);
            throw error;
        }
    };

    window.getAuthHeaders = function() {
        const token = localStorage.getItem('jwt_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    window.logout = function() {
        console.log('👋 Logging out');
        if (confirm('Вы уверены что хотите выйти?')) {
            localStorage.clear();
            window.location.replace('/login.html');
        }
    };

    window.getCurrentUser = function() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('❌ Failed to get current user:', e);
            return null;
        }
    };

    window.isAdmin = function() {
        const user = window.getCurrentUser();
        return user && user.role === 'admin';
    };

    console.log('✅ Auth check completed');
})();
