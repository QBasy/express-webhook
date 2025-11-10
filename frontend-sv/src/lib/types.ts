export interface User {
    id: string;
    username: string;
    role: 'admin' | 'user';
    status: 'active' | 'pending' | 'rejected';
    createdAt: string;
}

export interface Room {
    id: string;
    name: string;
    createdAt: string;
    userId: string;
}

export interface Webhook {
    id: string;
    roomId: string;
    payload: any;
    receivedAt: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface RegisterResponse {
    message: string;
    user: User;
}

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
    message: string;
    type: AlertType;
}