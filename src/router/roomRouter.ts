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
}
