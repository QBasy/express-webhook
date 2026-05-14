import crypto from "crypto";
import { setImmediate as setImmediateP } from "timers/promises";
import { logger } from "../utils/logger";

export interface IWebhook {
    receiptId: string;
    body: any;
    timestamp?: string;
}

export interface IDuplicateReceipt {
    receiptId: string;
    timestamp?: string;
}

export interface IDuplicateGroup {
    bodyHash: string;
    count: number;
    body: any;
    firstReceiptId: string;
    lastReceiptId: string;
    firstTimestamp?: string;
    lastTimestamp?: string;
    receipts: IDuplicateReceipt[];
}

export interface IDuplicateGroupHeader {
    bodyHash: string;
    count: number;
    firstReceiptId: string;
    lastReceiptId: string;
    firstTimestamp?: string;
    lastTimestamp?: string;
    bodyPreview: string;
}

interface IInternalGroup {
    bodyHash: string;
    body: any;
    receipts: IDuplicateReceipt[];
}

export interface ISearchOptions {
    mode: "exact" | "substring";
    needle: any;
    offset: number;
    limit: number;
}

export interface ISearchResult {
    mode: "exact" | "substring";
    total: number;
    offset: number;
    limit: number;
    matches: IWebhook[];
}

const SCAN_CHUNK = 5000;
const PREVIEW_MAX = 200;

export function canonicalStringify(value: any): string {
    if (value === null || value === undefined) return JSON.stringify(value ?? null);
    if (typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonicalStringify).join(",") + "]";
    const keys = Object.keys(value).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalStringify(value[k])).join(",") + "}";
}

function makePreview(body: any): string {
    let s: string;
    try {
        s = JSON.stringify(body);
    } catch {
        s = String(body);
    }
    return s.length > PREVIEW_MAX ? s.slice(0, PREVIEW_MAX) + "…" : s;
}

/** Сканирует список хуков и возвращает карту групп дубликатов по bodyHash (только count >= 2). */
export async function scanDuplicateGroups(
    webhooks: readonly IWebhook[]
): Promise<Map<string, IInternalGroup>> {
    const buckets = new Map<string, IInternalGroup>();
    const total = webhooks.length;

    for (let i = 0; i < total; i += SCAN_CHUNK) {
        const end = Math.min(i + SCAN_CHUNK, total);
        for (let j = i; j < end; j++) {
            const wh = webhooks[j];
            const key = canonicalStringify(wh.body);
            const receipt: IDuplicateReceipt = { receiptId: wh.receiptId, timestamp: wh.timestamp };
            const existing = buckets.get(key);
            if (existing) {
                existing.receipts.push(receipt);
            } else {
                const bodyHash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 12);
                buckets.set(key, { bodyHash, body: wh.body, receipts: [receipt] });
            }
        }
        if (end < total) await setImmediateP();
    }

    const groupsByHash = new Map<string, IInternalGroup>();
    for (const g of buckets.values()) {
        if (g.receipts.length < 2) continue;
        groupsByHash.set(g.bodyHash, g);
    }

    logger.debug(`Duplicate scan: ${groupsByHash.size} group(s) over ${total} webhook(s)`);
    return groupsByHash;
}

export async function getDuplicateHeadersFromWebhooks(
    webhooks: readonly IWebhook[]
): Promise<IDuplicateGroupHeader[]> {
    const groupsByHash = await scanDuplicateGroups(webhooks);
    const headers: IDuplicateGroupHeader[] = [];
    for (const g of groupsByHash.values()) {
        const first = g.receipts[0];
        const last = g.receipts[g.receipts.length - 1];
        headers.push({
            bodyHash: g.bodyHash,
            count: g.receipts.length,
            firstReceiptId: first.receiptId,
            lastReceiptId: last.receiptId,
            firstTimestamp: first.timestamp,
            lastTimestamp: last.timestamp,
            bodyPreview: makePreview(g.body),
        });
    }
    headers.sort((a, b) => b.count - a.count);
    return headers;
}

export async function getDuplicateGroupFromWebhooks(
    webhooks: readonly IWebhook[],
    bodyHash: string
): Promise<IDuplicateGroup | undefined> {
    const groupsByHash = await scanDuplicateGroups(webhooks);
    const g = [...groupsByHash.values()].find(x => x.bodyHash === bodyHash);
    if (!g) return undefined;
    const first = g.receipts[0];
    const last = g.receipts[g.receipts.length - 1];
    return {
        bodyHash: g.bodyHash,
        count: g.receipts.length,
        body: g.body,
        firstReceiptId: first.receiptId,
        lastReceiptId: last.receiptId,
        firstTimestamp: first.timestamp,
        lastTimestamp: last.timestamp,
        receipts: g.receipts,
    };
}

export async function searchWebhooksInList(
    webhooks: readonly IWebhook[],
    opts: ISearchOptions
): Promise<ISearchResult> {
    const { mode, needle, offset, limit } = opts;
    const matches: IWebhook[] = [];

    if (mode === "exact") {
        const target = canonicalStringify(needle);
        for (let i = 0; i < webhooks.length; i += SCAN_CHUNK) {
            const end = Math.min(i + SCAN_CHUNK, webhooks.length);
            for (let j = i; j < end; j++) {
                if (canonicalStringify(webhooks[j].body) === target) {
                    matches.push(webhooks[j]);
                }
            }
            if (end < webhooks.length) await setImmediateP();
        }
    } else {
        const target = String(needle).replace(/\s+/g, "").toLowerCase();
        if (!target) {
            return { mode, total: 0, offset, limit, matches: [] };
        }
        for (let i = 0; i < webhooks.length; i += SCAN_CHUNK) {
            const end = Math.min(i + SCAN_CHUNK, webhooks.length);
            for (let j = i; j < end; j++) {
                let bodyStr: string;
                try {
                    bodyStr = JSON.stringify(webhooks[j].body);
                } catch {
                    bodyStr = String(webhooks[j].body);
                }
                bodyStr = bodyStr.replace(/\s+/g, "").toLowerCase();
                if (bodyStr.includes(target)) {
                    matches.push(webhooks[j]);
                }
            }
            if (end < webhooks.length) await setImmediateP();
        }
    }

    const total = matches.length;
    const slice = matches.slice(offset, offset + limit);
    return { mode, total, offset, limit, matches: slice };
}
