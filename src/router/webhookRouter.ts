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

    // Сводка дубликатов: только заголовки, с пагинацией. Лёгкий ответ.
    fastify.get("/:id/duplicates/summary", async (request, reply) => {
        const { id } = request.params as { id: string };
        const q = request.query as { page?: string; pageSize?: string };
        const repo = await roomRepository.getRoomRepo(id);
        if (!repo) return reply.status(404).send({ error: "Room not found" });

        const page = Math.max(1, parseInt(q.page ?? "1", 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? "20", 10) || 20));

        const headers = await repo.getDuplicateHeaders();
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
            totalWebhooks: repo.getWebhooks().length,
            groups: slice,
        });
    });

    // Детали одной группы: тело + страница receipts.
    fastify.get("/:id/duplicates/group/:hash", async (request, reply) => {
        const { id, hash } = request.params as { id: string; hash: string };
        const q = request.query as { offset?: string; limit?: string };
        const repo = await roomRepository.getRoomRepo(id);
        if (!repo) return reply.status(404).send({ error: "Room not found" });

        const offset = Math.max(0, parseInt(q.offset ?? "0", 10) || 0);
        const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? "100", 10) || 100));

        const group = await repo.getDuplicateGroup(hash);
        if (!group) return reply.status(404).send({ error: "Group not found" });

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

    // Поиск по содержимому хуков. POST потому что в теле может быть JSON.
    fastify.post("/:id/search", async (request, reply) => {
        const { id } = request.params as { id: string };
        const repo = await roomRepository.getRoomRepo(id);
        if (!repo) return reply.status(404).send({ error: "Room not found" });

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

        const result = await repo.searchWebhooks({ mode, needle, offset, limit });
        return reply.status(200).send(result);
    });

    fastify.delete("/:room_id/:webhook_id", async (request, reply) => {
        const { room_id, webhook_id } = request.params as { room_id: string, webhook_id: string };
        const repo = await roomRepository.getRoomRepo(room_id);

        if (!repo) {
            logger.warn(`Attempt to delete webhook from non-existent room ${room_id}`);
            return reply.status(404).send({ error: "Room not found" });
        }

        const webhook = repo.getWebhook(webhook_id);
        if (!webhook) {
            logger.warn(`Attempt to delete non-existent webhook ${webhook_id} in room ${room_id}`);
            return reply.status(404).send({ error: "Webhook not found" });
        }

        repo.deleteWebhook(webhook_id);
        logger.info(`Webhook ${webhook_id} deleted from room ${room_id}`);

        return reply.status(200).send({
            status: "deleted",
            webhookId: webhook_id,
            roomId: room_id
        });
    });
}