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