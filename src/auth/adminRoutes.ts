import { FastifyInstance } from 'fastify';
import { validateAdminToken, requireAdmin } from './middleware';

export async function adminRoutes(fastify: FastifyInstance) {
    fastify.post('/users', {
        preHandler: validateAdminToken,
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string', minLength: 3 },
                    password: { type: 'string', minLength: 6 },
                    role: { type: 'string', enum: ['user', 'admin'] },
                    webhookTTL: { type: 'number', minimum: 60 }
                }
            }
        }
    }, async (request, reply) => {
        const { username, password, role, webhookTTL } = request.body as {
            username: string;
            password: string;
            role?: 'user' | 'admin';
            webhookTTL?: number;
        };

        try {
            const result = await fastify.authService.createUser(
                username,
                password,
                role || 'user',
                webhookTTL || 43200
            );

            return reply.status(201).send({
                message: 'User created successfully',
                userId: result.userId
            });
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    fastify.get('/users', {
        preHandler: validateAdminToken
    }, async (request, reply) => {
        const users = await fastify.mongo.db.collection('users')
            .find({}, { projection: { password: 0 } }) // Не показываем пароли
            .toArray();

        return { users };
    });

    fastify.delete('/users/:userId', {
        preHandler: validateAdminToken
    }, async (request, reply) => {
        const { userId } = request.params as { userId: string };

        const user = await fastify.authService.getUserById(userId);
        if (user?.username === 'admin') {
            return reply.status(403).send({
                error: 'Cannot delete default admin user'
            });
        }

        const result = await fastify.mongo.db.collection('users').deleteOne({
            _id: new (require('mongodb').ObjectId)(userId)
        });

        if (result.deletedCount === 0) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return { message: 'User deleted successfully', userId };
    });

    fastify.patch('/users/:userId/ttl', {
        preHandler: validateAdminToken
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
}