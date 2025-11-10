import { browser } from '$app/environment';
import type { User } from './types';

export function saveAuth(token: string, user: User) {
    if (!browser) return;
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
    if (!browser) return;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
}

export function getStoredUser(): User | null {
    if (!browser) return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

export function isAuthenticated(): boolean {
    if (!browser) return false;
    return !!localStorage.getItem('jwt_token');
}

export function isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
}