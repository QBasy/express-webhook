import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPostgresPool(): Pool {
    if (!pool) {
        throw new Error('PostgreSQL pool is not initialized');
    }
    return pool;
}

export async function connectPostgres(connectionString?: string): Promise<Pool> {
    const conn = connectionString || process.env.DATABASE_URL;
    if (!conn) {
        throw new Error(
            'DATABASE_URL is not set. Render PostgreSQL provides this variable.\n' +
                'Example: DATABASE_URL=postgres://user:pass@host:5432/dbname'
        );
    }

    pool = new Pool({
        connectionString: conn,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000,
    });

    const c = await pool.connect();
    try {
        await c.query('SELECT 1');
    } finally {
        c.release();
    }

    return pool;
}

export async function closePostgres(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
