import { api } from '$lib/utils/api';

interface User {
	_id: string;
	username: string;
	email: string;
	role: 'admin' | 'user';
	status: 'pending' | 'approved' | 'rejected';
	webhookTTL?: number;
	createdAt?: Date;
}

class AuthState {
	user = $state<User | null>(null);
	token = $state<string | null>(null);
	isAuthenticated = $derived(!!this.user && !!this.token);
	isAdmin = $derived(this.user?.role === 'admin');
	
	async login(username: string, password: string) {
		try {
			const response = await api.login(username, password);
			
			this.user = response.user;
			this.token = response.token;
			
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('jwt_token', response.token);
				localStorage.setItem('user', JSON.stringify(response.user));
			}
			
			return response;
		} catch (error) {
			throw error;
		}
	}
	
	async register(username: string, email: string, password: string, reason?: string) {
		return api.register(username, email, password, reason);
	}
	
	async logout() {
		try {
			await api.logout();
		} catch (e) {
			console.error('Logout error:', e);
		}
		
		this.user = null;
		this.token = null;
		
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('jwt_token');
			localStorage.removeItem('user');
		}
	}
	
	loadFromStorage() {
		if (typeof localStorage === 'undefined') return;
		
		const token = localStorage.getItem('jwt_token');
		const userStr = localStorage.getItem('user');
		
		if (token && userStr) {
			try {
				this.token = token;
				this.user = JSON.parse(userStr);
			} catch (e) {
				console.error('Failed to parse user from localStorage:', e);
				this.clearAuth();
			}
		}
	}
	
	async verifyToken() {
		if (!this.token) return false;
		
		try {
			const user = await api.getMe();
			this.user = user;
			
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('user', JSON.stringify(user));
			}
			
			return true;
		} catch (e) {
			console.error('Token verification failed:', e);
			this.clearAuth();
			return false;
		}
	}
	
	clearAuth() {
		this.user = null;
		this.token = null;
		
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('jwt_token');
			localStorage.removeItem('user');
		}
	}
}

export const authState = new AuthState();
