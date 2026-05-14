import {FastifyInstance, FastifyRequest} from "fastify";
import {logger} from "../utils/logger";
import {WebhookMetadata} from "../repository/webhooksRepo";

// Функция для извлечения метаданных из запроса
function extractMetadata(request: FastifyRequest): WebhookMetadata {
    const headers: Record<string, string | string[]> = {};

    // Собираем все заголовки
    Object.keys(request.headers).forEach(key => {
        const value = request.headers[key];
        if (value !== undefined) {
            headers[key] = value;
        }
    });

    // Извлекаем IP адрес (с учетом прокси)
    const ip =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (request.headers['x-real-ip'] as string) ||
        request.ip ||
        'unknown';

    return {
        method: request.method,
        url: request.protocol + '://' + request.hostname + request.url,
        headers,
        query: request.query as Record<string, string | string[]>,
        host: request.hostname,
        ip,
        userAgent: request.headers['user-agent'] as string,
        contentType: request.headers['content-type'] as string,
        contentLength: request.headers['content-length']
            ? parseInt(request.headers['content-length'] as string, 10)
            : undefined
    };
}

export async function webhookRoutes(fastify: FastifyInstance) {

    fastify.get("/all/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            logger.warn(`Attempt to access webhooks for non-existent room ${id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const webhooks = await fastify.webhookRepo.getWebhooks(id);
        return reply.status(200).send(webhooks);
    });

    // Сводка дубликатов (до двухсегментного `/:room_id/:webhook_id`)
    fastify.get("/:id/duplicates/summary", async (request, reply) => {
        const { id } = request.params as { id: string };
        const q = request.query as { page?: string; pageSize?: string };

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            return reply.status(404).send({ error: "Room not found" });
        }

        const page = Math.max(1, parseInt(q.page ?? "1", 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? "20", 10) || 20));

        const headers = await fastify.webhookRepo.getDuplicateHeaders(id);
        const allHooks = await fastify.webhookRepo.getWebhooks(id);
        const totalGroups = headers.length;
        const totalDuplicateWebhooks = headers.reduce((s, h) => s + h.count, 0);
        const start = (page - 1) * pageSize;
        const slice = headers.slice(start, start + pageSize);

        return reply.status(200).send({
            roomId: id,
            page,
            pageSize,
            totalGroups,
            totalPages: Math.max(1, Math.ceil(totalGroups / pageSize)),
            totalDuplicateWebhooks,
            totalWebhooks: allHooks.length,
            groups: slice,
        });
    });

    fastify.get("/:id/duplicates/group/:hash", async (request, reply) => {
        const { id, hash } = request.params as { id: string; hash: string };
        const q = request.query as { offset?: string; limit?: string };

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            return reply.status(404).send({ error: "Room not found" });
        }

        const offset = Math.max(0, parseInt(q.offset ?? "0", 10) || 0);
        const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? "100", 10) || 100));

        const group = await fastify.webhookRepo.getDuplicateGroup(id, hash);
        if (!group) {
            return reply.status(404).send({ error: "Group not found" });
        }

        const slice = group.receipts.slice(offset, offset + limit);
        return reply.status(200).send({
            bodyHash: group.bodyHash,
            count: group.count,
            body: group.body,
            firstReceiptId: group.firstReceiptId,
            lastReceiptId: group.lastReceiptId,
            firstTimestamp: group.firstTimestamp,
            lastTimestamp: group.lastTimestamp,
            offset,
            limit,
            receiptsTotal: group.count,
            receipts: slice,
        });
    });

    fastify.post("/:id/search", async (request, reply) => {
        const { id } = request.params as { id: string };

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            return reply.status(404).send({ error: "Room not found" });
        }

        const body = (request.body ?? {}) as {
            mode?: "exact" | "substring";
            query?: string;
            offset?: number;
            limit?: number;
        };

        const mode = body.mode === "exact" ? "exact" : "substring";
        const offset = Math.max(0, Number(body.offset) || 0);
        const limit = Math.min(500, Math.max(1, Number(body.limit) || 50));

        if (typeof body.query !== "string" || body.query.trim() === "") {
            return reply.status(400).send({ error: "query is required" });
        }

        let needle: any = body.query;
        if (mode === "exact") {
            try {
                needle = JSON.parse(body.query);
            } catch (e) {
                return reply.status(400).send({
                    error: "exact mode requires valid JSON in query",
                    detail: String(e).slice(0, 200),
                });
            }
        }

        const result = await fastify.webhookRepo.searchWebhooks(id, { mode, needle, offset, limit });
        return reply.status(200).send(result);
    });

    fastify.delete("/delete/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            logger.warn(`Attempt to clear webhooks for non-existent room ${id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        await fastify.webhookRepo.clearWebhooks(id);
        return { status: "cleared" };
    });

    fastify.get("/:room_id/:webhook_id", async (request, reply) => {
        const { room_id, webhook_id } = request.params as {
            room_id: string;
            webhook_id: string;
        };

        const room = await fastify.roomRepo.getRoom(room_id);
        if (!room) {
            logger.warn(`Attempt to get webhook from non-existent room ${room_id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const webhook = await fastify.webhookRepo.getWebhook(room_id, webhook_id);
        if (!webhook) {
            logger.warn(`Webhook ${webhook_id} not found in room ${room_id}`);
            return reply.status(404).send({ error: "Webhook not found" });
        }

        return reply.status(200).send(webhook);
    });

    fastify.all("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        if (request.method === 'GET') {
            return;
        }

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            logger.warn(`Attempt to add webhook to non-existent room ${id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const fake = await fastify.roomRepo.getFakeErrorStatus(id);
        if (fake.enabled && fake.statusCode) {
            return reply.status(fake.statusCode).send({
                error: `Simulated ${fake.statusCode}`
            });
        }

        const metadata = extractMetadata(request);

        const webhook = request.body || {};

        const receiptId = await fastify.webhookRepo.addWebhook(
            id,
            webhook,
            room.webhookTTL,
            metadata
        );

        await fastify.roomRepo.updateActivity(id);

        logger.info(`Webhook received: ${request.method} ${metadata.url} -> receiptId: ${receiptId}`);

        return {
            status: "ok",
            receiptId,
            method: request.method
        };
    });

    fastify.delete("/:room_id/:webhook_id", async (request, reply) => {
        const { room_id, webhook_id } = request.params as {
            room_id: string;
            webhook_id: string;
        };

        const room = await fastify.roomRepo.getRoom(room_id);
        if (!room) {
            logger.warn(`Attempt to delete webhook from non-existent room ${room_id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const webhook = await fastify.webhookRepo.getWebhook(room_id, webhook_id);
        if (!webhook) {
            logger.warn(`Attempt to delete non-existent webhook ${webhook_id} in room ${room_id}`);
            return reply.status(404).send({ error: "Webhook not found" });
        }

        const deleted = await fastify.webhookRepo.deleteWebhook(room_id, webhook_id);
        if (deleted) {
            logger.info(`Webhook ${webhook_id} deleted from room ${room_id}`);
            return reply.status(200).send({
                status: "deleted",
                webhookId: webhook_id,
                roomId: room_id
            });
        } else {
            return reply.status(500).send({ error: "Failed to delete webhook" });
        }
    });
}