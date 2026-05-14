export type DatabaseBackend = 'mongo' | 'postgres';

export function getDatabaseBackend(): DatabaseBackend {
    const raw = (process.env.DATABASE_BACKEND || process.env.DB_BACKEND || 'mongo').toLowerCase();
    if (raw === 'postgres' || raw === 'postgresql' || raw === 'pg') {
        return 'postgres';
    }
    return 'mongo';
}
