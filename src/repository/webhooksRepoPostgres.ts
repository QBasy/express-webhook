import type { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import type { Webhook, WebhookMetadata } from './webhooksRepo';
import type { ISearchOptions, ISearchResult, IWebhook } from './webhookSearchUtils';
import {
    getDuplicateGroupFromWebhooks,
    getDuplicateHeadersFromWebhooks,
    searchWebhooksInList,
} from './webhookSearchUtils';

export class WebhookRepositoryPostgres {
    constructor(private pool: Pool) {}

    private async purgeExpired(roomId: string): Promise<void> {
        await this.pool.query(`DELETE FROM webhooks WHERE room_id = $1 AND expires_at < now()`, [roomId]);
    }

    async addWebhook(
        roomId: string,
        body: unknown,
        ttlSeconds: number,
        metadata: WebhookMetadata
    ): Promise<string> {
        await this.purgeExpired(roomId);
        const receiptId = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

        await this.pool.query(
            `INSERT INTO webhooks (receipt_id, room_id, body, metadata, timestamp_iso, created_at, expires_at)
             VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)`,
            [
                receiptId,
                roomId,
                JSON.stringify(body ?? {}),
                JSON.stringify(metadata),
                now.toISOString(),
                now,
                expiresAt,
            ]
        );

        logger.debug(`Webhook ${receiptId} added to room ${roomId}, expires at ${expiresAt.toISOString()}`);
        return receiptId;
    }

    async getWebhooks(roomId: string): Promise<Webhook[]> {
        await this.purgeExpired(roomId);
        const { rows } = await this.pool.query(
            `SELECT receipt_id AS "receiptId", room_id AS "roomId", body, metadata,
                    timestamp_iso AS "timestamp", created_at AS "createdAt", expires_at AS "expiresAt"
             FROM webhooks WHERE room_id = $1 ORDER BY created_at DESC`,
            [roomId]
        );
        return rows.map((r: any) => ({
            receiptId: r.receiptId,
            roomId: r.roomId,
            body: r.body,
            metadata: r.metadata,
            timestamp: r.timestamp,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
        }));
    }

    async getWebhook(roomId: string, receiptId: string): Promise<Webhook | null> {
        await this.purgeExpired(roomId);
        const { rows } = await this.pool.query(
            `SELECT receipt_id AS "receiptId", room_id AS "roomId", body, metadata,
                    timestamp_iso AS "timestamp", created_at AS "createdAt", expires_at AS "expiresAt"
             FROM webhooks WHERE room_id = $1 AND receipt_id = $2`,
            [roomId, receiptId]
        );
        if (!rows[0]) return null;
        const r = rows[0];
        return {
            receiptId: r.receiptId,
            roomId: r.roomId,
            body: r.body,
            metadata: r.metadata,
            timestamp: r.timestamp,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
        };
    }

    async deleteWebhook(roomId: string, receiptId: string): Promise<boolean> {
        const res = await this.pool.query(`DELETE FROM webhooks WHERE room_id = $1 AND receipt_id = $2`, [
            roomId,
            receiptId,
        ]);
        if (res.rowCount && res.rowCount > 0) {
            logger.debug(`Webhook ${receiptId} deleted from room ${roomId}`);
        }
        return (res.rowCount ?? 0) > 0;
    }

    async clearWebhooks(roomId: string): Promise<void> {
        await this.pool.query(`DELETE FROM webhooks WHERE room_id = $1`, [roomId]);
        logger.debug(`All webhooks cleared from room ${roomId}`);
    }

    private toLight(webhooks: Webhook[]): IWebhook[] {
        return webhooks.map(w => ({
            receiptId: w.receiptId,
            body: w.body,
            timestamp: w.timestamp,
        }));
    }

    async getDuplicateHeaders(roomId: string) {
        const webhooks = await this.getWebhooks(roomId);
        return getDuplicateHeadersFromWebhooks(this.toLight(webhooks));
    }

    async getDuplicateGroup(roomId: string, bodyHash: string) {
        const webhooks = await this.getWebhooks(roomId);
        return getDuplicateGroupFromWebhooks(this.toLight(webhooks), bodyHash);
    }

    async searchWebhooks(roomId: string, opts: ISearchOptions): Promise<ISearchResult> {
        const webhooks = await this.getWebhooks(roomId);
        return searchWebhooksInList(this.toLight(webhooks), opts);
    }
}
