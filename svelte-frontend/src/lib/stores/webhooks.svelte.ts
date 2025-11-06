import { api } from '$lib/utils/api';

interface Webhook {
	_id: string;
	roomId: string;
	receiptId: string;
	timestamp: Date;
	typeWebhook?: string;
	body?: any;
	[key: string]: any;
}

class WebhooksState {
	items = $state<Webhook[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	currentRoom = $state<string | null>(null);
	
	count = $derived(this.items.length);
	isEmpty = $derived(this.items.length === 0);
	
	async fetchWebhooks(roomId: string) {
		this.loading = true;
		this.error = null;
		this.currentRoom = roomId;
		
		try {
			const data = await api.getWebhooks(roomId);
			this.items = data || [];
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Unknown error';
			this.items = [];
		} finally {
			this.loading = false;
		}
	}
	
	async deleteWebhook(roomId: string, webhookId: string) {
		try {
			await api.deleteWebhook(roomId, webhookId);
			
			// Удаляем из списка
			this.items = this.items.filter(w => w._id !== webhookId && w.receiptId !== webhookId);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Unknown error';
			throw e;
		}
	}
	
	async deleteAll() {
		if (!this.currentRoom) return;
		
		try {
			await api.clearWebhooks(this.currentRoom);
			this.items = [];
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Unknown error';
			throw e;
		}
	}
	
	clear() {
		this.items = [];
		this.currentRoom = null;
		this.error = null;
	}
}

export const webhooksState = new WebhooksState();
