// src/auth/adminRoutes.ts
import { FastifyInstance } from 'fastify';
import { requireAdmin } from './middleware';

export async function adminRoutes(fastify: FastifyInstance) {
    // Список всех пользователей (включая pending)
    fastify.get('/users', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        const users = await fastify.mongo.db?.collection('users')
            .find({}, { projection: { password: 0 } })
            .toArray();

        return { users };
    });

    // Одобрить пользователя
    fastify.post('/users/:userId/approve', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        const { userId } = request.params as { userId: string };

        const result = await fastify.authService.approveUser(userId);

        if (!result) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return { message: 'User approved successfully', userId };
    });

    // Отклонить пользователя
    fastify.post('/users/:userId/reject', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        const { userId } = request.params as { userId: string };
        const { reason } = request.body as { reason?: string };

        const result = await fastify.authService.rejectUser(userId, reason);

        if (!result) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return { message: 'User rejected', userId };
    });

    // Удалить пользователя
    fastify.delete('/users/:userId', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        const { userId } = request.params as { userId: string };

        // Нельзя удалить admin пользователя
        const user = await fastify.authService.getUserById(userId);
        if (user?.username === 'admin') {
            return reply.status(403).send({
                error: 'Cannot delete default admin user'
            });
        }

        const ObjectId = require('mongodb').ObjectId;
        const result = await fastify.mongo.db?.collection('users').deleteOne({
            _id: new ObjectId(userId)
        });

        if (result?.deletedCount === 0) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return { message: 'User deleted successfully', userId };
    });

    // Обновить TTL пользователя
    fastify.patch('/users/:userId/ttl', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        const { userId } = request.params as { userId: string };
        const { ttl } = request.body as { ttl: number };

        if (ttl < 60 || ttl > 86400) {
            return reply.status(400).send({
                error: 'TTL must be between 60s and 86400s (1 day)'
            });
        }

        await fastify.authService.updateUserTTL(userId, ttl);
        return { message: 'TTL updated successfully', ttl };
    });

    // Получить статистику
    fastify.get('/stats', {
        preHandler: requireAdmin
    }, async (request, reply) => {
        const users = await fastify.mongo.db?.collection('users')
            .aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ])
            .toArray();

        const rooms = await fastify.mongo.db?.collection('rooms')
            .countDocuments();

        const webhooks = await fastify.mongo.db?.collection('webhooks')
            .countDocuments();

        return {
            users: users?.reduce((acc: any, item: any) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            rooms,
            webhooks
        };
    });
}
