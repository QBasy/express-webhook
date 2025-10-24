import { FastifyInstance } from "fastify";
import { logger } from "../utils/logger";

export async function webhookRoutes(fastify: FastifyInstance) {
    fastify.get("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            logger.warn(`Attempt to access webhooks for non-existent room ${id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const webhooks = await fastify.webhookRepo.getWebhooks(id);
        return reply.status(200).send(webhooks);
    });

    fastify.post("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const webhook = request.body as any;

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

        const receiptId = await fastify.webhookRepo.addWebhook(id, webhook);

        await fastify.roomRepo.updateActivity(id);

        return {
            status: "ok",
            receiptId
        };
    });

    fastify.delete("/:id", async (request, reply) => {
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