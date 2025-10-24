// src/repository/webhookRepo.ts
import { Collection, ObjectId } from 'mongodb';
import { logger } from '../utils/logger';

export interface Webhook {
    _id?: ObjectId;
    receiptId: string;
    roomId: string;
    body: any;
    timestamp: string;
    createdAt: Date;
}

export class WebhookRepository {
    constructor(private webhooksCollection: Collection) {}

    async addWebhook(roomId: string, body: any): Promise<string> {
        const receiptId = new ObjectId().toString();

        await this.webhooksCollection.insertOne({
            receiptId,
            roomId,
            body,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        });

        logger.info(`Webhook ${receiptId} added to room ${roomId}`);
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
            logger.info(`Webhook ${receiptId} deleted from room ${roomId}`);
        }

        return result.deletedCount > 0;
    }

    async clearWebhooks(roomId: string): Promise<void> {
        await this.webhooksCollection.deleteMany({ roomId });
        logger.info(`All webhooks cleared from room ${roomId}`);
    }
}