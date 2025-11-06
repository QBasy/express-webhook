export interface Webhook {
	_id: string;
	roomId: string;
	method: string;
	headers: Record<string, string>;
	body: any;
	query: Record<string, string>;
	timestamp: Date;
	ip?: string;
}

export interface WebhookRoom {
	roomId: string;
	createdAt: Date;
	webhooksCount: number;
	lastWebhook?: Date;
}

export interface CreateWebhookRequest {
	roomId: string;
	method: string;
	headers: Record<string, string>;
	body: any;
	query: Record<string, string>;
	ip?: string;
}
