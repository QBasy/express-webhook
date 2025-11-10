import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../auth/middleware';
import type { User } from '../types/fastify';

export async function roomRoutes(fastify: FastifyInstance) {
    fastify.post('/:id', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = request.user as unknown as User;
        const userId = user._id.toString();

        if (user.role !== 'admin' && !id.startsWith(user.username + '_')) {
            return reply.status(403).send({
                error: 'Users can only create rooms with their username prefix'
            });
        }

        await fastify.roomRepo.createRoom(id, userId, user.webhookTTL);

        return reply.status(200).send({
            roomId: id,
            webhookUrl: `${request.protocol}://${request.hostname}/hook/${id}`,
            webhookTTL: user.webhookTTL
        });
    });

    fastify.get('/my-rooms', {
        preHandler: authenticate
    }, async (request, reply) => {
        const user = request.user as unknown as User;
        const userId = user._id.toString();
        const isAdmin = user.role === 'admin';

        const { page = 1, limit = 10 } = request.query as any;

        const data = await fastify.roomRepo.getUserRooms(
            userId,
            isAdmin,
            Number(page),
            Number(limit)
        );

        return reply.status(200).send(data);
    });

    fastify.delete('/:id', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = request.user as unknown as User;
        const userId = user._id.toString();
        const isAdmin = user.role === 'admin';

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) {
            return reply.status(404).send({ error: 'Room not found' });
        }

        if (!isAdmin && room.userId !== userId) {
            return reply.status(403).send({ error: 'Access denied' });
        }

        await fastify.roomRepo.closeRoom(id);
        return { message: 'Room closed successfully', roomId: id };
    });


    fastify.get('/all', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        const { page = 1, limit = 10 } = request.query as any;

        const data = await fastify.roomRepo.getAllRooms(Number(page), Number(limit));
        return reply.status(200).send(data);
    });

    fastify.post('/:id/fake-error', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const { enabled, statusCode, force } = request.body as { enabled: boolean; statusCode?: number; force?: boolean };
        const user = request.user as unknown as User;

        const room = await fastify.roomRepo.getRoom(id);
        if (!room) return reply.status(404).send({ error: 'Room not found' });

        if (user.role !== 'admin' && room.userId !== user._id.toString()) {
            return reply.status(403).send({ error: 'Access denied' });
        }

        await fastify.roomRepo.setFakeError(id, enabled, statusCode, force);
        const current = await fastify.roomRepo.getFakeErrorStatus(id);

        return reply.status(200).send({
            roomId: id,
            ...current,
            message: current.enabled
                ? `Fake error ${current.statusCode} enabled (force=${current.force})`
                : 'Fake error disabled',
        });
    });


    fastify.get('/:id/fake-error', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const current = await fastify.roomRepo.getFakeErrorStatus(id);
        return reply.status(200).send({ roomId: id, ...current });
    });

    fastify.get('/allRooms', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        return reply.status(200).send({
            rooms: await fastify.roomRepo.getAllRooms()
        });
    });
}
