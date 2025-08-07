export interface IWebhookReceive {
    addWebhook(webhookBody: any): void,
    clearWebhooks(): void,
    getWebhooks(): IWebhook[]
}

export interface IWebhook {
    receiptId: string,
    body: any,
}