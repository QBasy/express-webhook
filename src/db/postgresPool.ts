import dns from "node:dns";
import { URL } from "node:url";
import { Pool, PoolConfig } from "pg";

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

async function resolveIpv4Address(hostname: string): Promise<string | null> {
    try {
        const results = await dns.promises.lookup(hostname, { all: true, verbatim: true });
        const v4 = results.find((r) => r.family === 4);
        return v4?.address ?? null;
    } catch {
        return null;
    }
}

function poolConfigFromParts(
    parsed: ParsedConn,
    tcpHost: string,
    useTlsSni: boolean,
    connectionStringForSslHint: string
): PoolConfig {
    const useSsl = poolSslFromConnectionString(connectionStringForSslHint);
    const ssl = useSsl
        ? useTlsSni
            ? { rejectUnauthorized: true as const, servername: parsed.logicalHost }
            : { rejectUnauthorized: true as const }
        : undefined;

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
    return cfg;
}

export async function connectPostgres(connectionString?: string): Promise<Pool> {
    const conn = connectionString || process.env.DATABASE_URL;
    if (!conn) {
        throw new Error(
            "DATABASE_URL is not set. For Supabase: Project Settings → Database → copy the URI.\n" +
                "On Render use Transaction pooler (port 6543) if direct host has no IPv4, or set DATABASE_HOST_IPV4."
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
                    `Fix (pick one):\n` +
                    `1) Supabase Dashboard → Database → Connection string → "Transaction pooler" ` +
                    `(host like aws-0-*.pooler.supabase.com, port 6543, user postgres.<project-ref>).\n` +
                    `2) Set DATABASE_HOST_IPV4 to the database IPv4 if Supabase shows one.\n` +
                    `Docs: https://supabase.com/docs/guides/database/connecting-to-postgres`
            );
        }
    }

    const cfg = poolConfigFromParts(parsed, tcpHost, useTlsSni, conn);
    pool = new Pool(cfg);

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
