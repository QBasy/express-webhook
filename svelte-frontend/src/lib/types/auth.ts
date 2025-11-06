export interface User {
	_id: string;
	username: string;
	email: string;
	password: string;
	role: 'admin' | 'user';
	status: 'pending' | 'approved' | 'rejected';
	reason?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserPublic {
	_id: string;
	username: string;
	email: string;
	role: 'admin' | 'user';
	status: 'pending' | 'approved' | 'rejected';
	createdAt: Date;
}

export interface LoginRequest {
	username: string;
	password: string;
}

export interface RegisterRequest {
	username: string;
	email: string;
	password: string;
	reason?: string;
}

export interface AuthResponse {
	token: string;
	user: UserPublic;
}
