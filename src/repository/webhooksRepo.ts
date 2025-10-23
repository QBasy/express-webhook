import { logger } from "../utils/logger";

export interface IWebhook {
    receiptId: string;
    body: any;
    timestamp?: string;
}

export interface IWebhookRepository {
    addWebhook(webhookBody: any): void;
    clearWebhooks(): void;
    getWebhooks(): readonly IWebhook[];
    getWebhook(id: string): IWebhook | undefined;
    deleteWebhook(id: string): void;
    fakeError?: boolean;
}

export class InMemoryWebhookRepository implements IWebhookRepository {
    private webhooks: IWebhook[] = [];
    private idCounter = 1;
    fakeError = false;

    addWebhook(webhookBody: any) {
        const webhook: IWebhook = {
            receiptId: this.idCounter.toString(),
            body: webhookBody,
            timestamp: new Date().toISOString(),
        };
        this.webhooks.push(webhook);
        this.idCounter++;
        logger.info(`Webhook added with ID ${webhook.receiptId}. Total webhooks: ${this.webhooks.length}`);
    }

    clearWebhooks() {
        this.webhooks = [];
        this.idCounter = 1;
        logger.info(`Webhooks cleared.`);
    }

    getWebhook(id: string): IWebhook | undefined {
        const webhook = this.webhooks.find(w => w.receiptId === id);
        if (!webhook) {
            logger.warn(`Webhook with ID ${id} not found`);
        }
        return webhook;
    }

    deleteWebhook(receiptId: string) {
        const index = this.webhooks.findIndex(w => w.receiptId === receiptId);
        if (index === -1) {
            logger.warn(`Webhook ${receiptId} not found for deletion`);
            return;
        }
        this.webhooks.splice(index, 1);
        logger.info(`Webhook ${receiptId} deleted. Remaining: ${this.webhooks.length}`);
    }

    getWebhooks(): readonly IWebhook[] {
        return this.webhooks;
    }
}