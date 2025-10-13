// src/router/roomRouter.ts
import { FastifyInstance } from "fastify";
import { roomRepository } from "../repository/roomRepo";

export async function roomRoutes(fastify: FastifyInstance) {
    fastify.post("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        await roomRepository.createRoom(id);
        return reply.status(200).send({ roomId: id, fullUrl: `${fastify.server.address()}/hook/${id}` });
    });

    fastify.delete("/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        await roomRepository.closeRoom(id);

        return reply.status(200).send({ info: `successfully closed room for ${id}`, roomId: id });
    });

    fastify.get("/all", async (request, reply) => {
        const ids = await roomRepository.getAllRoomIds();
        return reply.status(200).send({ rooms: ids });
    });

    fastify.post("/:id/fake-error", async (request, reply) => {
        const { id } = request.params as { id: string };
        const { enabled } = request.body as { enabled: boolean };

        await roomRepository.setFakeError(id, enabled);
        const current = await roomRepository.isFakeErrorEnabled(id);

        return reply.status(200).send({
            roomId: id,
            fakeError: current,
            message: current ? "Fake error simulation enabled" : "Fake error disabled"
        });
    });

    fastify.get("/:id/fake-error", async (request, reply) => {
        const { id } = request.params as { id: string };
        const enabled = await roomRepository.isFakeErrorEnabled(id);
        return reply.status(200).send({ roomId: id, fakeError: enabled });
    });
}
