import { Collection, ObjectId } from "mongodb";
import { logger } from "../utils/logger";
import type {
    IDuplicateGroup,
    IDuplicateGroupHeader,
    IDuplicateReceipt,
    ISearchOptions,
    ISearchResult,
    IWebhook,
} from "./webhookSearchUtils";
import {
    getDuplicateGroupFromWebhooks,
    getDuplicateHeadersFromWebhooks,
    searchWebhooksInList,
} from "./webhookSearchUtils";

export type { IDuplicateGroup, IDuplicateGroupHeader, IDuplicateReceipt, ISearchOptions, ISearchResult, IWebhook };

export interface WebhookMetadata {
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    query: Record<string, string | string[]>;
    host: string;
    ip: string;
    userAgent?: string;
    contentType?: string;
    contentLength?: number;
}

export interface Webhook {
    _id?: ObjectId;
    receiptId: string;
    roomId: string;
    body: any;
    metadata: WebhookMetadata;
    timestamp: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface WebhookPage {
    webhooks: Webhook[];
    total: number;
}

function toIWebhook(w: Webhook): IWebhook {
    return {
        receiptId: w.receiptId,
        body: w.body,
        timestamp: w.timestamp,
    };
}

export class WebhookRepository {
    constructor(private webhooksCollection: Collection) {}

    // Возвращает сохранённый Webhook целиком (а не только receiptId) — чтобы
    // роутер мог сразу заэмитить его в SSE, не делая лишний getWebhook()
    // (который на Postgres — это ещё один purgeExpired() + SELECT на каждый
    // принятый вебхук).
    async addWebhook(
        roomId: string,
        body: any,
        ttlSeconds: number,
        metadata: WebhookMetadata
    ): Promise<Webhook> {
        const receiptId = new ObjectId().toString();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

        const webhook: Webhook = {
            receiptId,
            roomId,
            body,
            metadata,
            timestamp: now.toISOString(),
            createdAt: now,
            expiresAt,
        };

        await this.webhooksCollection.insertOne(webhook);

        logger.debug(`Webhook ${receiptId} added to room ${roomId}, expires at ${expiresAt.toISOString()}`);
        return webhook;
    }

    async getWebhooks(roomId: string): Promise<Webhook[]> {
        return (await this.webhooksCollection
            .find({ roomId })
            .sort({ createdAt: -1 })
            .toArray()) as Webhook[];
    }

    async getWebhooksPage(
        roomId: string,
        opts: { offset: number; limit: number; order: "newest" | "oldest" }
    ): Promise<WebhookPage> {
        const sortDir = opts.order === "oldest" ? 1 : -1;
        const [webhooks, total] = await Promise.all([
            this.webhooksCollection
                .find({ roomId })
                .sort({ createdAt: sortDir })
                .skip(opts.offset)
                .limit(opts.limit)
                .toArray() as Promise<Webhook[]>,
            this.webhooksCollection.countDocuments({ roomId }),
        ]);
        return { webhooks, total };
    }

    // Для догона SSE-подписчиков после реконнекта: всё, что появилось после `since`.
    async getWebhooksSince(roomId: string, since: Date): Promise<Webhook[]> {
        return (await this.webhooksCollection
            .find({ roomId, createdAt: { $gt: since } })
            .sort({ createdAt: 1 })
            .toArray()) as Webhook[];
    }

    async getWebhook(roomId: string, receiptId: string): Promise<Webhook | null> {
        return (await this.webhooksCollection.findOne({
            roomId,
            receiptId,
        })) as Webhook | null;
    }

    async deleteWebhook(roomId: string, receiptId: string): Promise<boolean> {
        const result = await this.webhooksCollection.deleteOne({
            roomId,
            receiptId,
        });

        if (result.deletedCount > 0) {
            logger.debug(`Webhook ${receiptId} deleted from room ${roomId}`);
        }

        return result.deletedCount > 0;
    }

    async clearWebhooks(roomId: string): Promise<void> {
        await this.webhooksCollection.deleteMany({ roomId });
        logger.debug(`All webhooks cleared from room ${roomId}`);
    }

    async getDuplicateHeaders(roomId: string) {
        const webhooks = await this.getWebhooks(roomId);
        const light = webhooks.map(toIWebhook);
        return getDuplicateHeadersFromWebhooks(light);
    }

    async getDuplicateGroup(roomId: string, bodyHash: string) {
        const webhooks = await this.getWebhooks(roomId);
        const light = webhooks.map(toIWebhook);
        return getDuplicateGroupFromWebhooks(light, bodyHash);
    }

    async searchWebhooks(roomId: string, opts: ISearchOptions): Promise<ISearchResult> {
        const webhooks = await this.getWebhooks(roomId);
        const light = webhooks.map(toIWebhook);
        return searchWebhooksInList(light, opts);
    }
}
