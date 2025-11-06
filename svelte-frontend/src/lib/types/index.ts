// Frontend types (backend types are in Fastify)

export interface User {
	_id: string;
	username: string;
	email: string;
	role: 'admin' | 'user';
	status: 'pending' | 'approved' | 'rejected';
	webhookTTL?: number;
	createdAt?: Date;
}

export interface Webhook {
	_id: string;
	roomId: string;
	receiptId: string;
	timestamp: Date;
	typeWebhook?: string;
	body?: any;
	[key: string]: any;
}

export interface Room {
	_id: string;
	roomId: string;
	userId: string;
	webhookTTL: number;
	createdAt: Date;
	lastActivity: Date;
	fakeErrorEnabled?: boolean;
	fakeErrorCode?: number;
}
