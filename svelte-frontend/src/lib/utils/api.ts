// API клиент для общения с Fastify бэкендом
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
	requireAuth?: boolean;
}

class ApiClient {
	private baseUrl: string;
	
	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}
	
	private getAuthHeaders(): HeadersInit {
		const token = this.getToken();
		
		if (token) {
			return {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			};
		}
		
		return {
			'Content-Type': 'application/json'
		};
	}
	
	private getToken(): string | null {
		if (typeof localStorage === 'undefined') return null;
		return localStorage.getItem('jwt_token');
	}
	
	async request<T>(
		endpoint: string,
		options: FetchOptions = {}
	): Promise<T> {
		const { requireAuth = false, ...fetchOptions } = options;
		
		const url = `${this.baseUrl}${endpoint}`;
		
		const headers: HeadersInit = {
			...this.getAuthHeaders(),
			...(fetchOptions.headers || {})
		};
		
		try {
			const response = await fetch(url, {
				...fetchOptions,
				headers
			});
			
			// Если 401 и требуется auth - разлогиниваем
			if (response.status === 401 && requireAuth) {
				if (typeof localStorage !== 'undefined') {
					localStorage.removeItem('jwt_token');
					localStorage.removeItem('user');
				}
				throw new Error('Unauthorized');
			}
			
			// Если не OK - выбрасываем ошибку
			if (!response.ok) {
				const error = await response.json().catch(() => ({ error: 'Unknown error' }));
				throw new Error(error.error || error.message || `HTTP ${response.status}`);
			}
			
			return await response.json();
			
		} catch (error) {
			console.error('API request failed:', error);
			throw error;
		}
	}
	
	// Auth endpoints
	async login(username: string, password: string) {
		return this.request<{ token: string; user: any }>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ username, password })
		});
	}
	
	async register(username: string, email: string, password: string, reason?: string) {
		return this.request<{ message: string; userId: string }>('/auth/register', {
			method: 'POST',
			body: JSON.stringify({ username, email, password, reason })
		});
	}
	
	async getMe() {
		return this.request<any>('/auth/me', {
			requireAuth: true
		});
	}
	
	async updateMyTTL(ttl: number) {
		return this.request<{ message: string; ttl: number }>('/auth/me/ttl', {
			method: 'PATCH',
			requireAuth: true,
			body: JSON.stringify({ ttl })
		});
	}
	
	async logout() {
		return this.request<{ message: string }>('/auth/logout', {
			method: 'POST'
		});
	}
	
	// Room endpoints
	async createRoom(roomId: string) {
		return this.request<{ roomId: string; webhookUrl: string; webhookTTL: number }>(`/hook/${roomId}`, {
			method: 'POST',
			requireAuth: true
		});
	}
	
	async getMyRooms() {
		return this.request<{ rooms: any[] }>('/room/allRooms', {
			requireAuth: true
		});
	}
	
	async getAllRoomsWithCount() {
		return this.request<{ rooms: any[] }>('/room/allRooms', {
			requireAuth: true
		});
	}
	
	async deleteRoom(roomId: string) {
		return this.request<{ message: string; roomId: string }>(`/room/${roomId}`, {
			method: 'DELETE',
			requireAuth: true
		});
	}
	
	async getAllRooms() {
		return this.request<{ rooms: any[] }>('/room/allRooms', {
			requireAuth: true
		});
	}
	
	async setFakeError(roomId: string, enabled: boolean, statusCode?: number) {
		return this.request<any>(`/room/${roomId}/fake-error`, {
			method: 'POST',
			requireAuth: true,
			body: JSON.stringify({ enabled, statusCode })
		});
	}
	
	async getFakeErrorStatus(roomId: string) {
		return this.request<any>(`/room/${roomId}/fake-error`, {
			requireAuth: true
		});
	}
	
	// Webhook endpoints
	async getWebhooks(roomId: string) {
		return this.request<any[]>(`/hook/${roomId}`);
	}
	
	async clearWebhooks(roomId: string) {
		return this.request<{ status: string }>(`/hook/${roomId}`, {
			method: 'DELETE',
			requireAuth: true
		});
	}
	
	async deleteWebhook(roomId: string, webhookId: string) {
		return this.request<{ status: string; webhookId: string; roomId: string }>(
			`/hook/${roomId}/${webhookId}`,
			{
				method: 'DELETE',
				requireAuth: true
			}
		);
	}
	
	// Admin endpoints
	async getUsers() {
		return this.request<{ users: any[] }>('/admin/users', {
			requireAuth: true
		});
	}
	
	async approveUser(userId: string) {
		return this.request<{ message: string; userId: string }>(`/admin/users/${userId}/approve`, {
			method: 'POST',
			requireAuth: true
		});
	}
	
	async rejectUser(userId: string, reason?: string) {
		return this.request<{ message: string; userId: string }>(`/admin/users/${userId}/reject`, {
			method: 'POST',
			requireAuth: true,
			body: JSON.stringify({ reason })
		});
	}
	
	async deleteUser(userId: string) {
		return this.request<{ message: string; userId: string }>(`/admin/users/${userId}`, {
			method: 'DELETE',
			requireAuth: true
		});
	}
	
	async updateUserTTL(userId: string, ttl: number) {
		return this.request<{ message: string; ttl: number }>(`/admin/users/${userId}/ttl`, {
			method: 'PATCH',
			requireAuth: true,
			body: JSON.stringify({ ttl })
		});
	}
	
	async getStats() {
		return this.request<{ users: any; rooms: number; webhooks: number }>('/admin/stats', {
			requireAuth: true
		});
	}
}

export const api = new ApiClient(API_BASE_URL);
