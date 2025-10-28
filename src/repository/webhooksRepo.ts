import { Collection, ObjectId } from 'mongodb';
import { logger } from '../utils/logger';

export interface Webhook {
    _id?: ObjectId;
    receiptId: string;
    roomId: string;
    body: any;
    timestamp: string;
    createdAt: Date;
    expiresAt: Date; // ← ДОБАВЛЕНО для TTL
}

export class WebhookRepository {
    constructor(private webhooksCollection: Collection) {}

    async addWebhook(roomId: string, body: any, ttlSeconds: number): Promise<string> {
        const receiptId = new ObjectId().toString();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

        await this.webhooksCollection.insertOne({
            receiptId,
            roomId,
            body,
            timestamp: now.toISOString(),
            createdAt: now,
            expiresAt // ← TTL будет работать
        });

        logger.debug(`Webhook ${receiptId} added to room ${roomId}, expires at ${expiresAt.toISOString()}`);
        return receiptId;
    }

    async getWebhooks(roomId: string): Promise<Webhook[]> {
        return await this.webhooksCollection
            .find({ roomId })
            .sort({ createdAt: -1 })
            .toArray() as Webhook[];
    }

    async getWebhook(roomId: string, receiptId: string): Promise<Webhook | null> {
        return await this.webhooksCollection.findOne({
            roomId,
            receiptId
        }) as Webhook | null;
    }

    async deleteWebhook(roomId: string, receiptId: string): Promise<boolean> {
        const result = await this.webhooksCollection.deleteOne({
            roomId,
            receiptId
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
}