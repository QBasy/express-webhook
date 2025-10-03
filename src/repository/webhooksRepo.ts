// src/repository/webhooksRepo.ts
import {logger} from "../utils/logger";

export interface IWebhook {
    receiptId: string;
    body: any;
}
export interface IWebhookRepository {
    addWebhook(webhookBody: any): void;
    clearWebhooks(): void;
    getWebhooks(): IWebhook[];
    getWebhook(id: number): IWebhook
    deleteWebhook(id: number): void
}

export class InMemoryWebhookRepository implements IWebhookRepository {
    private webhooks: IWebhook[] = [];
    addWebhook(webhookBody: any) {
        const webhook: IWebhook = {
            receiptId: (this.webhooks.length + 1).toString(),
            body: webhookBody,
        };
        this.webhooks.push(webhook);
        logger.info(`Webhook added. Total webhooks: ${this.webhooks.length}`);
    };

    clearWebhooks() {
        this.webhooks = [];
        logger.info(`Webhooks cleared. Total webhooks: ${this.webhooks.length}`);
    };

    getWebhook(id: number): IWebhook {
        return this.webhooks[id];
    };

    deleteWebhook(id: number) {
        delete this.webhooks[id];
    }

    getWebhooks(): IWebhook[] {
        return this.webhooks;
    };
}
