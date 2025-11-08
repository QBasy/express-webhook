import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export interface User {
    username: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'rejected';
    createdAt?: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
}

const STORAGE_TOKEN_KEY = 'jwt_token';
const STORAGE_USER_KEY = 'user';

// Инициализация из localStorage
function createAuthStore() {
    const initialState: AuthState = {
        token: browser ? localStorage.getItem(STORAGE_TOKEN_KEY) : null,
        user: browser ? getStoredUser() : null,
        isLoading: false
    };

    const { subscribe, set, update } = writable<AuthState>(initialState);

    return {
        subscribe,

        async verifyToken() {
            const token = browser ? localStorage.getItem(STORAGE_TOKEN_KEY) : null;
            if (!token) return false;

            update(state => ({ ...state, isLoading: true }));

            try {
                const response = await fetch('/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    this.logout();
                    return false;
                }

                const userData = await response.json();

                if (browser) {
                    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
                }

                update(state => ({
                    ...state,
                    user: userData,
                    isLoading: false
                }));

                return true;
            } catch (error) {
                console.error('Token verification failed:', error);
                this.logout();
                return false;
            }
        },

        async login(username: string, password: string) {
            update(state => ({ ...state, isLoading: true }));

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Ошибка входа');
                }

                // Проверяем статус пользователя
                if (data.user.status === 'pending') {
                    update(state => ({ ...state, isLoading: false }));
                    throw new Error('Ваша заявка ожидает одобрения администратором');
                }

                if (data.user.status === 'rejected') {
                    update(state => ({ ...state, isLoading: false }));
                    throw new Error('Ваша заявка была отклонена администратором');
                }

                // Сохраняем в localStorage и store
                if (browser) {
                    localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
                    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
                }

                set({
                    token: data.token,
                    user: data.user,
                    isLoading: false
                });

                return { success: true, user: data.user };
            } catch (error) {
                update(state => ({ ...state, isLoading: false }));
                throw error;
            }
        },

        async register(username: string, password: string) {
            update(state => ({ ...state, isLoading: true }));

            try {
                const response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Ошибка регистрации');
                }

                update(state => ({ ...state, isLoading: false }));
                return { success: true, message: data.message };
            } catch (error) {
                update(state => ({ ...state, isLoading: false }));
                throw error;
            }
        },

        logout() {
            if (browser) {
                if (confirm('Вы уверены что хотите выйти?')) {
                    localStorage.removeItem(STORAGE_TOKEN_KEY);
                    localStorage.removeItem(STORAGE_USER_KEY);
                    set({ token: null, user: null, isLoading: false });
                    goto('/login');
                }
            }
        },

        // Принудительный выход (без подтверждения)
        forceLogout() {
            if (browser) {
                localStorage.removeItem(STORAGE_TOKEN_KEY);
                localStorage.removeItem(STORAGE_USER_KEY);
            }
            set({ token: null, user: null, isLoading: false });
            goto('/login');
        }
    };
}

// Helper для получения пользователя из localStorage
function getStoredUser(): User | null {
    if (!browser) return null;

    try {
        const userStr = localStorage.getItem(STORAGE_USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
}

export const authStore = createAuthStore();

export const isAuthenticated = derived(
    authStore,
    $auth => !!$auth.token && !!$auth.user
);

export const isAdmin = derived(
    authStore,
    $auth => $auth.user?.role === 'admin'
);

export const currentUser = derived(
    authStore,
    $auth => $auth.user
);

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = browser ? localStorage.getItem(STORAGE_TOKEN_KEY) : null;

    if (!options.headers) {
        options.headers = {};
    }

    if (token && !url.includes('/hook/')) {
        (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, options);

        if (response.status === 401) {
            authStore.forceLogout();
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}