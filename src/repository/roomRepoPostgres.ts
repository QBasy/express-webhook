import type { Pool } from 'pg';
import { logger } from '../utils/logger';
import type { Room } from './roomRepo';

export class RoomRepositoryPostgres {
    constructor(private pool: Pool) {}

    async createRoom(roomId: string, userId: string, webhookTTL: number): Promise<void> {
        await this.pool.query(
            `INSERT INTO rooms (room_id, user_id, webhook_ttl, created_at, last_activity_at)
             VALUES ($1, $2, $3, now(), now())
             ON CONFLICT (room_id) DO UPDATE SET
               user_id = EXCLUDED.user_id,
               webhook_ttl = EXCLUDED.webhook_ttl,
               last_activity_at = now()`,
            [roomId, userId, webhookTTL]
        );
        logger.info(`Room ${roomId} created/updated for user ${userId}`);
    }

    async getRoom(roomId: string): Promise<Room | null> {
        const { rows } = await this.pool.query(
            `SELECT room_id AS "roomId", user_id AS "userId", webhook_ttl AS "webhookTTL",
                    created_at AS "createdAt", last_activity_at AS "lastActivityAt",
                    forward_enabled AS "forwardEnabled", forward_url AS "forwardUrl"
             FROM rooms WHERE room_id = $1`,
            [roomId]
        );
        if (!rows[0]) return null;
        const r = rows[0];
        return {
            roomId: r.roomId,
            userId: r.userId,
            webhookTTL: r.webhookTTL,
            createdAt: r.createdAt,
            lastActivityAt: r.lastActivityAt,
            forwardEnabled: r.forwardEnabled,
            forwardUrl: r.forwardUrl,
        };
    }

    async getUserRooms(userId: string, isAdmin: boolean): Promise<Room[]> {
        const q = isAdmin
            ? `SELECT room_id AS "roomId", user_id AS "userId", webhook_ttl AS "webhookTTL",
                      created_at AS "createdAt", last_activity_at AS "lastActivityAt"
               FROM rooms ORDER BY created_at DESC`
            : `SELECT room_id AS "roomId", user_id AS "userId", webhook_ttl AS "webhookTTL",
                      created_at AS "createdAt", last_activity_at AS "lastActivityAt"
               FROM rooms WHERE user_id = $1 ORDER BY created_at DESC`;
        const { rows } = isAdmin ? await this.pool.query(q) : await this.pool.query(q, [userId]);
        return rows.map((r: any) => ({
            roomId: r.roomId,
            userId: r.userId,
            webhookTTL: r.webhookTTL,
            createdAt: r.createdAt,
            lastActivityAt: r.lastActivityAt,
        }));
    }

    async getAllRooms(): Promise<Array<{ roomId: string; webhooksCount: number }>> {
        const { rows } = await this.pool.query(
            `SELECT r.room_id AS "roomId", COUNT(w.receipt_id)::int AS "webhooksCount"
             FROM rooms r
             LEFT JOIN webhooks w ON w.room_id = r.room_id
             GROUP BY r.room_id
             ORDER BY r.room_id`
        );
        return rows;
    }

    async closeRoom(roomId: string): Promise<void> {
        await this.pool.query('DELETE FROM webhooks WHERE room_id = $1', [roomId]);
        await this.pool.query('DELETE FROM fake_errors WHERE room_id = $1', [roomId]);
        await this.pool.query('DELETE FROM rooms WHERE room_id = $1', [roomId]);
        logger.info(`Room ${roomId} closed`);
    }

    async updateActivity(roomId: string): Promise<void> {
        await this.pool.query(`UPDATE rooms SET last_activity_at = now() WHERE room_id = $1`, [roomId]);
    }

    async setForwarding(roomId: string, enabled: boolean, url?: string | null): Promise<void> {
        await this.pool.query(
            `UPDATE rooms SET forward_enabled = $2, forward_url = $3 WHERE room_id = $1`,
            [roomId, enabled, enabled ? (url || null) : (url ?? null)]
        );
        logger.info(`Forwarding for ${roomId}: ${enabled ? `ON -> ${url}` : 'OFF'}`);
    }

    async getForwardingStatus(roomId: string): Promise<{ enabled: boolean; url: string | null }> {
        const { rows } = await this.pool.query(
            `SELECT forward_enabled AS "forwardEnabled", forward_url AS "forwardUrl" FROM rooms WHERE room_id = $1`,
            [roomId]
        );
        if (!rows[0]) return { enabled: false, url: null };
        return { enabled: Boolean(rows[0].forwardEnabled), url: rows[0].forwardUrl ?? null };
    }

    async setFakeError(roomId: string, enabled: boolean, statusCode?: number): Promise<void> {
        await this.pool.query(
            `INSERT INTO fake_errors (room_id, enabled, status_code, updated_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (room_id) DO UPDATE SET
               enabled = EXCLUDED.enabled,
               status_code = EXCLUDED.status_code,
               updated_at = now()`,
            [roomId, enabled, enabled ? statusCode || 500 : null]
        );
        logger.info(`Fake error for ${roomId}: ${enabled ? `ON (${statusCode || 500})` : 'OFF'}`);
    }

    async getFakeErrorStatus(roomId: string): Promise<{ enabled: boolean; statusCode: number | null }> {
        const { rows } = await this.pool.query(
            `SELECT enabled, status_code AS "statusCode" FROM fake_errors WHERE room_id = $1`,
            [roomId]
        );
        if (!rows[0]) {
            return { enabled: false, statusCode: null };
        }
        return { enabled: rows[0].enabled, statusCode: rows[0].statusCode };
    }
}
