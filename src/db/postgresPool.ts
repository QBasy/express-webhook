import dns from "node:dns";
import type { ConnectionOptions } from "node:tls";
import { URL } from "node:url";
import { Pool, PoolConfig } from "pg";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

export function getPostgresPool(): Pool {
    if (!pool) {
        throw new Error("PostgreSQL pool is not initialized");
    }
    return pool;
}

function poolSslFromConnectionString(connectionString: string): boolean {
    if (/sslmode=disable/i.test(connectionString)) {
        return false;
    }
    if (/sslmode=require|sslmode=verify-full|sslmode=verify-ca/i.test(connectionString)) {
        return true;
    }
    if (/\.supabase\.co\b|pooler\.supabase\.com\b/i.test(connectionString)) {
        return true;
    }
    return false;
}

interface ParsedConn {
    user: string;
    password: string;
    logicalHost: string;
    port: number;
    database: string;
    /** query string including leading ? */
    search: string;
}

function parsePostgresUrl(connectionString: string): ParsedConn {
    const normalized = connectionString.trim().replace(/^postgresql:/i, "postgres:");
    const u = new URL(normalized);
    const database = (u.pathname || "/postgres").replace(/^\//, "") || "postgres";
    return {
        user: decodeURIComponent(u.username || ""),
        password: decodeURIComponent(u.password || ""),
        logicalHost: u.hostname,
        port: u.port ? parseInt(u.port, 10) : 5432,
        database,
        search: u.search || "",
    };
}

/** Supabase Transaction pooler (Supavisor): порт 6543 — без prepared statements; pg с $1 их использует. */
function isSupabaseTransactionPool(parsed: ParsedConn): boolean {
    if (parsed.port !== 6543) {
        return false;
    }
    return (
        parsed.logicalHost.includes("pooler.supabase.com") ||
        /\.supabase\.co$/i.test(parsed.logicalHost)
    );
}

async function resolveIpv4Address(hostname: string): Promise<string | null> {
    try {
        const results = await dns.promises.lookup(hostname, { all: true, verbatim: true });
        const v4 = results.find((r) => r.family === 4);
        return v4?.address ?? null;
    } catch {
        return null;
    }
}

function isSupabaseSharedPoolerHost(hostname: string): boolean {
    return /\.pooler\.supabase\.com$/i.test(hostname);
}

/**
 * У Supavisor (shared pooler) цепочка часто не совпадает с дефолтным store Node → «self-signed certificate in certificate chain».
 * Для *.pooler.supabase.com по умолчанию rejectUnauthorized=false (TLS всё равно шифрует). Строго: DATABASE_SSL_STRICT=true.
 */
function buildSslConfig(
    parsed: ParsedConn,
    useTlsSni: boolean,
    connectionString: string
): { ssl: ConnectionOptions | undefined; relaxedForPooler: boolean } {
    if (!poolSslFromConnectionString(connectionString)) {
        return { ssl: undefined, relaxedForPooler: false };
    }

    const pooler = isSupabaseSharedPoolerHost(parsed.logicalHost);
    const strict =
        process.env.DATABASE_SSL_STRICT === "true" ||
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";

    let rejectUnauthorized = true;
    if (pooler && !strict) {
        rejectUnauthorized = false;
    }
    if (process.env.DATABASE_SSL_INSECURE === "true") {
        rejectUnauthorized = false;
    }

    const relaxedForPooler = pooler && rejectUnauthorized === false;

    const ssl: ConnectionOptions = {
        rejectUnauthorized,
        ...(useTlsSni ? { servername: parsed.logicalHost } : {}),
    };

    return { ssl, relaxedForPooler };
}

function poolConfigFromParts(
    parsed: ParsedConn,
    tcpHost: string,
    useTlsSni: boolean,
    connectionStringForSslHint: string
): { cfg: PoolConfig; relaxedForPooler: boolean } {
    const { ssl, relaxedForPooler } = buildSslConfig(parsed, useTlsSni, connectionStringForSslHint);

    const qs = new URLSearchParams(parsed.search.startsWith("?") ? parsed.search.slice(1) : parsed.search);
    const options = qs.get("options") ?? undefined;

    const cfg: PoolConfig = {
        user: parsed.user,
        password: parsed.password,
        host: tcpHost,
        port: parsed.port,
        database: parsed.database,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 20_000,
        ...(ssl ? { ssl } : {}),
        ...(options ? { options } : {}),
    };
    return { cfg, relaxedForPooler };
}

export async function connectPostgres(connectionString?: string): Promise<Pool> {
    const conn = connectionString || process.env.DATABASE_URL;
    if (!conn) {
        throw new Error(
            "DATABASE_URL is not set. Supabase: Dashboard → Connect → Postgres URI. " +
                "Для Render без IPv6 используй Session pooler (порт 5432 на *.pooler.supabase.com), см. .env.supabase."
        );
    }

    const parsed = parsePostgresUrl(conn);
    const manualIp = process.env.DATABASE_HOST_IPV4?.trim();

    let tcpHost: string;
    let useTlsSni: boolean;

    if (manualIp) {
        tcpHost = manualIp;
        useTlsSni = true;
    } else {
        const ipv4 = await resolveIpv4Address(parsed.logicalHost);
        if (ipv4) {
            tcpHost = ipv4;
            useTlsSni = true;
        } else {
            throw new Error(
                `PostgreSQL host "${parsed.logicalHost}" has no IPv4 (A) record. ` +
                    `Render cannot reach IPv6-only hosts (ENETUNREACH).\n\n` +
                    `Рекомендуется (долгоживущий Node + pg):\n` +
                    `1) Supabase Dashboard → Connect → Session pooler — порт 5432, хост aws-0-*.pooler.supabase.com, ` +
                    `пользователь postgres.<project-ref>. Поддерживает IPv4 и prepared statements.\n` +
                    `2) Transaction pooler (6543) с node-postgres без доработок драйвера не подходит: нет поддержки prepared statements при $1.\n` +
                    `3) DATABASE_HOST_IPV4 — только если есть явный IPv4.\n` +
                    `https://supabase.com/docs/guides/database/connecting-to-postgres`
            );
        }
    }

    const { cfg, relaxedForPooler } = poolConfigFromParts(parsed, tcpHost, useTlsSni, conn);
    pool = new Pool(cfg);

    if (relaxedForPooler) {
        logger.warn(
            "TLS: для хоста *.pooler.supabase.com включён режим без строгой проверки цепочки сертификатов " +
                "(rejectUnauthorized=false), чтобы Node не падал на «self-signed certificate in certificate chain». " +
                "Трафик остаётся по TLS. Для строгой проверки задай DATABASE_SSL_STRICT=true и при необходимости CA из дашборда Supabase."
        );
    }
    if (isSupabaseTransactionPool(parsed)) {
        logger.warn(
            "DATABASE_URL указывает на Supabase Transaction pooler (порт 6543). " +
                "В этом режиме нельзя использовать prepared statements; pg@8 использует их для запросов с параметрами ($1). " +
                "Для Render лучше Session pooler (порт 5432, тот же pooler-хост). " +
                "Опции вроде preparedStatementCache в Pool для pg 8.16 нет — см. https://supabase.com/docs/guides/database/connecting-to-postgres"
        );
    }

    const c = await pool.connect();
    try {
        await c.query("SELECT 1");
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
