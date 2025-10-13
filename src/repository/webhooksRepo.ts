import { logger } from "../utils/logger";

export interface IWebhook {
    receiptId: string;
    body: any;
}

export interface IWebhookRepository {
    addWebhook(webhookBody: any): void;
    clearWebhooks(): void;
    getWebhooks(): readonly IWebhook[];
    getWebhook(id: string): IWebhook;
    deleteWebhook(id: string): void;
    fakeError?: boolean;
}

export class InMemoryWebhookRepository implements IWebhookRepository {
    private webhooks: IWebhook[] = [];
    fakeError = false;

    addWebhook(webhookBody: any) {
        const webhook: IWebhook = {
            receiptId: (this.webhooks.length + 1).toString(),
            body: webhookBody,
        };
        this.webhooks.push(webhook);
        logger.info(`Webhook added. Total webhooks: ${this.webhooks.length}`);
    }

    clearWebhooks() {
        this.webhooks = [];
        logger.info(`Webhooks cleared.`);
    }

    getWebhook(id: string): IWebhook {
        return this.webhooks[parseInt(id)];
    }

    deleteWebhook(receiptId: string) {
        const index = this.webhooks.findIndex(w => w.receiptId === receiptId);
        if (index === -1) {
            logger.warn(`Webhook ${receiptId} not found`);
            return;
        }
        this.webhooks.splice(index, 1);
        logger.info(`Webhook ${receiptId} deleted. Remaining: ${this.webhooks.length}`);
    }

    getWebhooks(): readonly IWebhook[] {
        return this.webhooks;
    }
}

