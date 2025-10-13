import { FastifyInstance } from "fastify";
import { roomRepository } from "../repository/roomRepo";
import {logger} from "../utils/logger";

export async function webhookRoutes(fastify: FastifyInstance) {
    fastify.get("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const repo = await roomRepository.getRoomRepo(id);
        if (!repo) {
            logger.warn(`Attempt to access webhooks for non-existent room ${id}`);
            return reply.status(404).send({ error: "Room not found" });
        }
        return reply.status(200).send(repo.getWebhooks());
    });

    fastify.post("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const webhook = request.body as any;

        const repo = await roomRepository.getRoomRepo(id);
        if (!repo) {
            logger.warn(`Attempt to add webhook to non-existent room ${id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const fake = await roomRepository.getFakeErrorStatus(id);
        if (fake.enabled && fake.statusCode) {
            return reply.status(fake.statusCode).send({ error: `Simulated ${fake.statusCode}` });
        }

        repo.addWebhook(webhook);
        return { status: "ok" };
    });

    fastify.delete("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const repo = await roomRepository.getRoomRepo(id);
        if (!repo) {
            logger.warn(`Attempt to clear webhooks for non-existent room ${id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        repo.clearWebhooks();
        return { status: "cleared" };
    });

    fastify.delete("/:room_id/:webhook_id", async (request, reply) => {
        const { room_id, webhook_id } = request.params as { room_id: string, webhook_id: number };
        const repo = await roomRepository.getRoomRepo(room_id);
        if (!repo) {
            logger.warn(`Attempt to clear webhooks for non-existent room ${room_id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const webhook = repo.getWebhook(webhook_id);
        if (!webhook) {
            logger.warn(`Attempt to clear non existing webhook ${webhook_id} in room ${room_id}`);
            return reply.status(404).send({ error: "Webhook not found" });
        }

        repo.deleteWebhook(webhook_id);
    });
}