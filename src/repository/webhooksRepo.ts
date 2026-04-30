import { logger } from "../utils/logger";
import crypto from "crypto";

export interface IWebhook {
    receiptId: string;
    body: any;
    timestamp?: string;
}

export interface IDuplicateGroup {
    bodyHash: string;
    count: number;
    body: any;
    webhooks: IWebhook[];
}

export interface IWebhookRepository {
    addWebhook(webhookBody: any): void;
    clearWebhooks(): void;
    getWebhooks(): readonly IWebhook[];
    getWebhook(id: string): IWebhook | undefined;
    deleteWebhook(id: string): void;
    getDuplicates(): IDuplicateGroup[];
    fakeError?: boolean;
}

/**
 * Канонизированная сериализация: сортируем ключи объектов рекурсивно,
 * чтобы {a:1,b:2} и {b:2,a:1} давали одинаковый ключ.
 * Массивы сохраняют порядок (это семантически важно).
 */
function canonicalStringify(value: any): string {
    if (value === null || value === undefined) return JSON.stringify(value ?? null);
    if (typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
        return "[" + value.map(canonicalStringify).join(",") + "]";
    }
    const keys = Object.keys(value).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalStringify(value[k])).join(",") + "}";
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

    /**
     * Группирует вебхуки по содержимому body и возвращает только те группы,
     * где хотя бы 2 одинаковых хука. Самые "частые" дубликаты — первыми.
     */
    getDuplicates(): IDuplicateGroup[] {
        const buckets = new Map<string, IWebhook[]>();

        for (const wh of this.webhooks) {
            const key = canonicalStringify(wh.body);
            const arr = buckets.get(key);
            if (arr) arr.push(wh);
            else buckets.set(key, [wh]);
        }

        const groups: IDuplicateGroup[] = [];
        for (const [key, webhooks] of buckets.entries()) {
            if (webhooks.length < 2) continue;
            const bodyHash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 12);
            groups.push({
                bodyHash,
                count: webhooks.length,
                body: webhooks[0].body,
                webhooks,
            });
        }

        groups.sort((a, b) => b.count - a.count);
        logger.info(`Duplicate scan: ${groups.length} group(s) found across ${this.webhooks.length} webhook(s)`);
        return groups;
    }
}
