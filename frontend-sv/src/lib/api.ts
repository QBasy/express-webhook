import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export const API_BASE = browser ? window.location.origin : import.meta.env.VITE_API_URL;

function getToken(): string | null {
    if (!browser) return null;
    return localStorage.getItem('jwt_token');
}

function getAuthHeaders(): HeadersInit {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401 && browser) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        goto('/login');
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
}

export const api = {
    auth: {
        async login(username: string, password: string) {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            });
            return handleResponse(response);
        },

        async register(username: string, password: string) {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            });
            return handleResponse(response);
        },

        async me() {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async getUsers() {
            const response = await fetch(`${API_BASE}/admin/users`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async approveUser(userId: string) {
            const response = await fetch(`${API_BASE}/admin/users/${userId}/approve`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async rejectUser(userId: string) {
            const response = await fetch(`${API_BASE}/admin/users/${userId}/reject`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async deleteUser(userId: string) {
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async updateUserTTL(userId: string, ttl: number) {
            const response = await fetch(`${API_BASE}/admin/users/${userId}/ttl`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ttl})
            });
            return handleResponse(response);
        },
    },

    rooms: {
        async list(page: number = 1, limit: number = 10) {
            const response = await fetch(`${API_BASE}/room/my-rooms?page=${page}&limit=${limit}`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async create(name: string) {
            const response = await fetch(`${API_BASE}/room/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ name })
            });
            return handleResponse(response);
        },

        async delete(roomId: string) {
            const response = await fetch(`${API_BASE}/room/${roomId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async getWebhooks(roomId: string) {
            const response = await fetch(`${API_BASE}/room/${roomId}/webhooks`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async clearWebhooks(roomId: string) {
            const response = await fetch(`${API_BASE}/room/${roomId}/clear`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async getAllRooms(page: number = 1, limit: number = 10) {
            const response = await fetch(`${API_BASE}/room/all?page=${page}&limit=${limit}`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async getRoom(roomId: string) {
            const response = await fetch(`${API_BASE}/room/${encodeURIComponent(roomId)}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async getFakeErrorStatus(roomId: string) {
            const response = await fetch(`${API_BASE}/room/${encodeURIComponent(roomId)}/fake-error`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async setFakeError(roomId: string, enabled: boolean, statusCode: number) {
            const response = await fetch(`${API_BASE}/room/${encodeURIComponent(roomId)}/fake-error`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ enabled, statusCode })
            });
            return handleResponse(response);
        }
    },

    webhooks: {
        async send(roomId: string, payload: any) {
            const response = await fetch(`${API_BASE}/hook/${roomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return handleResponse(response);
        },
        async getAll(roomId: string, page: number = 1, limit: number = 25) {
            const response = await fetch(`${API_BASE}/hook/all/${encodeURIComponent(roomId)}?page=${page}&limit=${limit}`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async getDetails(roomId: string, receiptId: string) {
            const response = await fetch(`${API_BASE}/hook/${encodeURIComponent(roomId)}/${encodeURIComponent(receiptId)}`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async deleteOne(roomId: string, receiptId: string) {
            const response = await fetch(`${API_BASE}/hook/${encodeURIComponent(roomId)}/${encodeURIComponent(receiptId)}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async deleteAll(roomId: string) {
            const response = await fetch(`${API_BASE}/hook/delete/${encodeURIComponent(roomId)}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },

        async forward(endpoint: string, payload: any) {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return response;
        }
    }
};
