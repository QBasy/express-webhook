import { FastifyInstance } from 'fastify';
import { authenticate } from '../auth/middleware';
import type { User } from '../types/fastify';

export async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        const { username, password } = request.body as { username: string; password: string };

        const user = await fastify.authService.authenticate(username, password);

        if (!user) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const token = fastify.jwt.sign({
            userId: user._id.toString(),
            username: user.username,
            role: user.role
        });

        return {
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                webhookTTL: user.webhookTTL
            }
        };
    });

    fastify.patch('/me/ttl', {
        preHandler: authenticate
    }, async (request, reply) => {
        const { ttl } = request.body as { ttl: number };
        const user = request.user as unknown as User;
        const userId = user._id.toString();

        if (ttl < 60 || ttl > 86400) {
            return reply.status(400).send({
                error: 'TTL must be between 60s and 86400s (1 day)'
            });
        }

        await fastify.authService.updateUserTTL(userId, ttl);
        return { message: 'TTL updated successfully', ttl };
    });

    fastify.get('/me', {
        preHandler: authenticate
    }, async (request, reply) => {
        const user = request.user as unknown as User;
        return {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            webhookTTL: user.webhookTTL,
            createdAt: user.createdAt
        };
    });
}