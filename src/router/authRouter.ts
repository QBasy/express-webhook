import { FastifyInstance } from 'fastify';
import { authenticate } from '../auth/middleware';

export async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/register', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                    username: { type: 'string', minLength: 3 },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    reason: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        const { username, email, password, reason } = request.body as {
            username: string;
            email: string;
            password: string;
            reason?: string;
        };

        try {
            const userId = await fastify.authService.registerUser(
                username,
                email,
                password,
                reason
            );

            return reply.status(201).send({
                message: 'Registration request submitted. Waiting for admin approval.',
                userId
            });
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Логин
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
        const { username, password } = request.body as {
            username: string;
            password: string;
        };

        try {
            const result = await fastify.authService.login(username, password);

            return reply.send({
                token: result.token,
                user: {
                    _id: result.user._id,
                    username: result.user.username,
                    email: result.user.email,
                    role: result.user.role,
                    status: result.user.status,
                    webhookTTL: result.user.webhookTTL
                }
            });
        } catch (error: any) {
            return reply.status(401).send({ error: error.message });
        }
    });

    // Получить информацию о себе
    fastify.get('/me', {
        preHandler: authenticate
    }, async (request, reply) => {
        const user = request.user as any;

        return reply.send({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            webhookTTL: user.webhookTTL,
            createdAt: user.createdAt
        });
    });

    // Обновить свой TTL
    fastify.patch('/me/ttl', {
        preHandler: authenticate,
        schema: {
            body: {
                type: 'object',
                required: ['ttl'],
                properties: {
                    ttl: { type: 'number', minimum: 60, maximum: 86400 }
                }
            }
        }
    }, async (request, reply) => {
        const user = request.user as any;
        const { ttl } = request.body as { ttl: number };

        await fastify.authService.updateUserTTL(user._id.toString(), ttl);

        return reply.send({
            message: 'TTL updated successfully',
            ttl
        });
    });

    // Выход (удаление токена на клиенте)
    fastify.post('/logout', async (request, reply) => {
        return reply.send({ message: 'Logged out successfully' });
    });
}