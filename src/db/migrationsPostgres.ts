/**
 * Обычный Postgres и Supabase (managed PostgreSQL).
 * На Supabase при необходимости включи расширение pgcrypto в SQL Editor, если CREATE EXTENSION из приложения недоступен.
 */
import type { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const STATEMENTS = [
    `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

    `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        webhook_ttl_seconds INT NOT NULL DEFAULT 43200,
        reason TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        approved_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email)) WHERE email IS NOT NULL`,

    `CREATE TABLE IF NOT EXISTS rooms (
        room_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        webhook_ttl INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS rooms_user_id_idx ON rooms (user_id)`,

    `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS forward_enabled BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS forward_url TEXT`,

    `CREATE TABLE IF NOT EXISTS fake_errors (
        room_id TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT false,
        status_code INT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS webhooks (
        receipt_id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        body JSONB NOT NULL,
        metadata JSONB NOT NULL,
        timestamp_iso TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
    )`,

    `CREATE INDEX IF NOT EXISTS webhooks_room_created_idx ON webhooks (room_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS webhooks_expires_idx ON webhooks (expires_at)`,
];

export async function runPostgresMigrations(pool: Pool): Promise<void> {
    logger.info('Running PostgreSQL migrations...');

    for (const sql of STATEMENTS) {
        try {
            await pool.query(sql);
        } catch (e: any) {
            logger.warn(`Migration statement warning: ${e?.message || e}`);
        }
    }

    const admin = await pool.query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
    if (admin.rowCount === 0) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await pool.query(
            `INSERT INTO users (username, email, password, role, status, webhook_ttl_seconds, created_at, approved_at)
             VALUES ($1, $2, $3, 'admin', 'approved', 43200, now(), now())`,
            ['admin', 'admin@webhook-viewer.local', hashedPassword]
        );
        logger.info('PostgreSQL: admin user created (username: admin, password: admin)');
    }

    logger.info('PostgreSQL migrations completed');
}
