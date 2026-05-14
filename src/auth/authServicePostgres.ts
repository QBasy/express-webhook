import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import { logger } from '../utils/logger';
import type { User } from '../types/fastify';

export class AuthServicePostgres {
    constructor(
        private pool: Pool,
        private jwtSign: (payload: any) => string
    ) {}

    private mapUser(row: any): User {
        return {
            _id: row.id,
            username: row.username,
            email: row.email ?? undefined,
            password: row.password,
            role: row.role,
            status: row.status,
            webhookTTL: row.webhook_ttl_seconds,
            reason: row.reason ?? undefined,
            rejectionReason: row.rejection_reason ?? undefined,
            createdAt: row.created_at,
            approvedAt: row.approved_at ?? undefined,
            rejectedAt: row.rejected_at ?? undefined,
        };
    }

    async createUser(
        username: string,
        password: string,
        role: 'admin' | 'user' = 'user',
        webhookTTL: number = 43200
    ): Promise<{ userId: string }> {
        const exists = await this.pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (exists.rowCount) {
            throw new Error('User already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await this.pool.query(
            `INSERT INTO users (username, email, password, role, status, webhook_ttl_seconds, created_at, approved_at)
             VALUES ($1, $2, $3, $4, 'approved', $5, now(), now())
             RETURNING id::text`,
            [username, `${username}@webhook-viewer.local`, hashedPassword, role, webhookTTL]
        );
        logger.info(`User created: ${username} (${role})`);
        return { userId: rows[0].id };
    }

    async registerUser(
        username: string,
        email: string,
        password: string,
        reason?: string
    ): Promise<string> {
        const u = await this.pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (u.rowCount) {
            throw new Error('Username already exists');
        }
        const e = await this.pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
        if (e.rowCount) {
            throw new Error('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await this.pool.query(
            `INSERT INTO users (username, email, password, role, status, webhook_ttl_seconds, reason, created_at)
             VALUES ($1, $2, $3, 'user', 'pending', 43200, $4, now())
             RETURNING id::text`,
            [username, email, hashedPassword, reason || null]
        );
        logger.info(`New registration request from ${username} (${email})`);
        return rows[0].id;
    }

    async login(username: string, password: string): Promise<{ token: string; user: User }> {
        const { rows } = await this.pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
        const row = rows[0];
        if (!row) {
            logger.warn(`Login attempt for non-existent user: ${username}`);
            throw new Error('Invalid username or password');
        }

        const user = this.mapUser(row);
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            logger.warn(`Invalid password for: ${username}`);
            throw new Error('Invalid username or password');
        }

        if (user.status === 'pending') {
            throw new Error('Account pending approval');
        }
        if (user.status === 'rejected') {
            throw new Error('Account has been rejected');
        }
        if (user.status !== 'approved') {
            throw new Error('Account is not approved');
        }

        const token = this.jwtSign({
            userId: String(user._id),
            username: user.username,
            role: user.role,
        });

        logger.info(`User logged in: ${username}`);
        return { token, user };
    }

    async authenticate(username: string, password: string): Promise<User | null> {
        try {
            const result = await this.login(username, password);
            return result.user;
        } catch {
            return null;
        }
    }

    async approveUser(userId: string): Promise<boolean> {
        const res = await this.pool.query(
            `UPDATE users SET status = 'approved', approved_at = now() WHERE id = $1::uuid AND status <> 'approved'`,
            [userId]
        );
        if (res.rowCount && res.rowCount > 0) {
            logger.info(`User ${userId} approved`);
            return true;
        }
        return false;
    }

    async rejectUser(userId: string, reason?: string): Promise<boolean> {
        const res = await this.pool.query(
            `UPDATE users SET status = 'rejected', rejected_at = now(), rejection_reason = $2
             WHERE id = $1::uuid`,
            [userId, reason || null]
        );
        if (res.rowCount && res.rowCount > 0) {
            logger.info(`User ${userId} rejected`);
            return true;
        }
        return false;
    }

    async getUserById(userId: string): Promise<User | null> {
        const { rows } = await this.pool.query(`SELECT * FROM users WHERE id = $1::uuid`, [userId]);
        if (!rows[0]) return null;
        return this.mapUser(rows[0]);
    }

    async updateUserTTL(userId: string, ttl: number): Promise<void> {
        await this.pool.query(`UPDATE users SET webhook_ttl_seconds = $2 WHERE id = $1::uuid`, [userId, ttl]);
        logger.info(`TTL updated for user ${userId}: ${ttl}s`);
    }

    async deleteUser(userId: string): Promise<boolean> {
        const res = await this.pool.query(`DELETE FROM users WHERE id = $1::uuid`, [userId]);
        return (res.rowCount ?? 0) > 0;
    }
}
