import { logger } from "../utils/logger";
import crypto from "crypto";
import { setImmediate as setImmediateP } from "timers/promises";

export interface IWebhook {
    receiptId: string;
    body: any;
    timestamp?: string;
}

export interface IDuplicateReceipt {
    receiptId: string;
    timestamp?: string;
}

/** Полная группа со списком ссылок. Используется при выдаче конкретной группы. */
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

/** Лёгкий заголовок группы для сводки. Без body и без массива receipts. */
export interface IDuplicateGroupHeader {
    bodyHash: string;
    count: number;
    firstReceiptId: string;
    lastReceiptId: string;
    firstTimestamp?: string;
    lastTimestamp?: string;
    /** Короткое превью тела, чтобы было что показать в списке. */
    bodyPreview: string;
}

/** Внутреннее представление одной группы при сканировании. */
interface IInternalGroup {
    bodyHash: string;
    body: any;
    receipts: IDuplicateReceipt[];
}

export interface IWebhookRepository {
    addWebhook(webhookBody: any): void;
    clearWebhooks(): void;
    getWebhooks(): readonly IWebhook[];
    getWebhook(id: string): IWebhook | undefined;
    deleteWebhook(id: string): void;
    /** Возвращает только заголовки. Дёшево для фронта. */
    getDuplicateHeaders(): Promise<IDuplicateGroupHeader[]>;
    /** Возвращает одну группу по hash. */
    getDuplicateGroup(bodyHash: string): Promise<IDuplicateGroup | undefined>;
    fakeError?: boolean;
}

const SCAN_CHUNK = 5000;
const PREVIEW_MAX = 200;

function canonicalStringify(value: any): string {
    if (value === null || value === undefined) return JSON.stringify(value ?? null);
    if (typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonicalStringify).join(",") + "]";
    const keys = Object.keys(value).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalStringify(value[k])).join(",") + "}";
}

function makePreview(body: any): string {
    let s: string;
    try { s = JSON.stringify(body); } catch { s = String(body); }
    return s.length > PREVIEW_MAX ? s.slice(0, PREVIEW_MAX) + "…" : s;
}

export class InMemoryWebhookRepository implements IWebhookRepository {
    private webhooks: IWebhook[] = [];
    private idCounter = 1;
    fakeError = false;

    /** Кэш результата сканирования: hash -> группа. Сбрасывается при любой мутации. */
    private groupsCache: Map<string, IInternalGroup> | null = null;
    /** Кэш отсортированных заголовков (по count desc). */
    private headersCache: IDuplicateGroupHeader[] | null = null;
    /** Один in-flight промис, чтобы параллельные запросы не запускали повторное сканирование. */
    private scanInFlight: Promise<void> | null = null;

    private invalidateCache() {
        this.groupsCache = null;
        this.headersCache = null;
        this.scanInFlight = null;
    }

    addWebhook(webhookBody: any) {
        const webhook: IWebhook = {
            receiptId: this.idCounter.toString(),
            body: webhookBody,
            timestamp: new Date().toISOString(),
        };
        this.webhooks.push(webhook);
        this.idCounter++;
        this.invalidateCache();
        logger.info(`Webhook added with ID ${webhook.receiptId}. Total: ${this.webhooks.length}`);
    }

    clearWebhooks() {
        this.webhooks = [];
        this.idCounter = 1;
        this.invalidateCache();
        logger.info(`Webhooks cleared.`);
    }

    getWebhook(id: string): IWebhook | undefined {
        return this.webhooks.find(w => w.receiptId === id);
    }

    deleteWebhook(receiptId: string) {
        const index = this.webhooks.findIndex(w => w.receiptId === receiptId);
        if (index === -1) return;
        this.webhooks.splice(index, 1);
        this.invalidateCache();
        logger.info(`Webhook ${receiptId} deleted. Remaining: ${this.webhooks.length}`);
    }

    getWebhooks(): readonly IWebhook[] {
        return this.webhooks;
    }

    /**
     * Чанковое сканирование с уступкой event loop. Не блокирует процесс.
     * Один запуск на инвалидацию кэша; параллельные вызовы ждут общий промис.
     */
    private ensureScanned(): Promise<void> {
        if (this.groupsCache && this.headersCache) return Promise.resolve();
        if (this.scanInFlight) return this.scanInFlight;

        this.scanInFlight = (async () => {
            const t0 = Date.now();
            const buckets = new Map<string, IInternalGroup>();
            const total = this.webhooks.length;

            for (let i = 0; i < total; i += SCAN_CHUNK) {
                const end = Math.min(i + SCAN_CHUNK, total);
                for (let j = i; j < end; j++) {
                    const wh = this.webhooks[j];
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
                // Уступаем event loop между чанками — сервер продолжает принимать запросы.
                if (end < total) await setImmediateP();
            }

            // Оставляем только реальные дубликаты, индексируем по bodyHash.
            const groupsByHash = new Map<string, IInternalGroup>();
            const headers: IDuplicateGroupHeader[] = [];
            for (const g of buckets.values()) {
                if (g.receipts.length < 2) continue;
                groupsByHash.set(g.bodyHash, g);
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

            this.groupsCache = groupsByHash;
            this.headersCache = headers;
            logger.info(`Duplicate scan: ${headers.length} group(s) over ${total} webhook(s) in ${Date.now() - t0}ms`);
        })();

        // После завершения (успех или ошибка) сбрасываем in-flight, чтобы можно было пересканировать.
        const settled = this.scanInFlight.finally(() => {
            // Если кэш уже инвалидировали во время сканирования — оставляем null,
            // следующий вызов запустит свежий скан.
        });
        return settled;
    }

    async getDuplicateHeaders(): Promise<IDuplicateGroupHeader[]> {
        await this.ensureScanned();
        return this.headersCache ?? [];
    }

    async getDuplicateGroup(bodyHash: string): Promise<IDuplicateGroup | undefined> {
        await this.ensureScanned();
        const g = this.groupsCache?.get(bodyHash);
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
}