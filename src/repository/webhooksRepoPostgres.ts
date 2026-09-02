import type { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import type { Webhook, WebhookMetadata, WebhookPage } from './webhooksRepo';
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

    // Возвращает сохранённый Webhook целиком (а не только receiptId) — чтобы
    // роутер мог сразу заэмитить его в SSE без лишнего getWebhook(), который
    // здесь означает ещё один purgeExpired() + SELECT на каждый принятый
    // вебхук — под нагрузкой это реально бьёт по пулу соединений.
    async addWebhook(
        roomId: string,
        body: unknown,
        ttlSeconds: number,
        metadata: WebhookMetadata
    ): Promise<Webhook> {
        await this.purgeExpired(roomId);
        const receiptId = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
        const normalizedBody = body ?? {};

        await this.pool.query(
            `INSERT INTO webhooks (receipt_id, room_id, body, metadata, timestamp_iso, created_at, expires_at)
             VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)`,
            [
                receiptId,
                roomId,
                JSON.stringify(normalizedBody),
                JSON.stringify(metadata),
                now.toISOString(),
                now,
                expiresAt,
            ]
        );

        logger.debug(`Webhook ${receiptId} added to room ${roomId}, expires at ${expiresAt.toISOString()}`);

        return {
            receiptId,
            roomId,
            body: normalizedBody,
            metadata,
            timestamp: now.toISOString(),
            createdAt: now,
            expiresAt,
        };
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

    async getWebhooksPage(
        roomId: string,
        opts: { offset: number; limit: number; order: 'newest' | 'oldest' }
    ): Promise<WebhookPage> {
        await this.purgeExpired(roomId);
        const direction = opts.order === 'oldest' ? 'ASC' : 'DESC';
        const [{ rows }, countResult] = await Promise.all([
            this.pool.query(
                `SELECT receipt_id AS "receiptId", room_id AS "roomId", body, metadata,
                        timestamp_iso AS "timestamp", created_at AS "createdAt", expires_at AS "expiresAt"
                 FROM webhooks WHERE room_id = $1 ORDER BY created_at ${direction} LIMIT $2 OFFSET $3`,
                [roomId, opts.limit, opts.offset]
            ),
            this.pool.query(`SELECT COUNT(*)::int AS total FROM webhooks WHERE room_id = $1`, [roomId]),
        ]);
        const webhooks = rows.map((r: any) => ({
            receiptId: r.receiptId,
            roomId: r.roomId,
            body: r.body,
            metadata: r.metadata,
            timestamp: r.timestamp,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
        }));
        return { webhooks, total: countResult.rows[0]?.total ?? 0 };
    }

    // Для догона SSE-подписчиков после реконнекта: всё, что появилось после `since`.
    async getWebhooksSince(roomId: string, since: Date): Promise<Webhook[]> {
        await this.purgeExpired(roomId);
        const { rows } = await this.pool.query(
            `SELECT receipt_id AS "receiptId", room_id AS "roomId", body, metadata,
                    timestamp_iso AS "timestamp", created_at AS "createdAt", expires_at AS "expiresAt"
             FROM webhooks WHERE room_id = $1 AND created_at > $2 ORDER BY created_at ASC`,
            [roomId, since]
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
