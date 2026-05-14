import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPostgresPool(): Pool {
    if (!pool) {
        throw new Error('PostgreSQL pool is not initialized');
    }
    return pool;
}

function poolSslOption(connectionString: string): { rejectUnauthorized: boolean } | undefined {
    if (/sslmode=disable/i.test(connectionString)) {
        return undefined;
    }
    if (/sslmode=require|sslmode=verify-full|sslmode=verify-ca/i.test(connectionString)) {
        return { rejectUnauthorized: true };
    }
    if (/\.supabase\.co\b|pooler\.supabase\.com\b/i.test(connectionString)) {
        return { rejectUnauthorized: true };
    }
    return undefined;
}

export async function connectPostgres(connectionString?: string): Promise<Pool> {
    const conn = connectionString || process.env.DATABASE_URL;
    if (!conn) {
        throw new Error(
            'DATABASE_URL is not set. For Supabase: Project Settings → Database → copy the URI (add ?sslmode=require if missing).\n' +
                'Example: postgresql://postgres:...@db.xxx.supabase.co:5432/postgres'
        );
    }

    const ssl = poolSslOption(conn);

    pool = new Pool({
        connectionString: conn,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000,
        ...(ssl ? { ssl } : {}),
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
