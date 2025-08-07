export interface IWebhookReceive {
    addWebhook(webhookBody: any): void,
    clearWebhooks(): void,
    getWebhooks(): IWebhook[]
}

interface IWebhook {
    receiptId: string,
    body: any,
}

class WebhookRepository implements IWebhookReceive {
    Webhooks: IWebhook[] = [];

    addWebhook(webhookBody: any) {
        const webhook: IWebhook = {
            receiptId: (this.Webhooks.length+1).toString(),
            body: webhookBody
        }

        this.Webhooks.push(webhook);
    }

    clearWebhooks() {
        this.Webhooks = []
    }

    getWebhooks(): IWebhook[] {
        return this.Webhooks
    }
}

export const webhookRepo = new WebhookRepository()