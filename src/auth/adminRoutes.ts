// src/auth/adminRoutes.ts
import { FastifyInstance } from 'fastify';
import { requireAdmin } from './middleware';

export async function adminRoutes(fastify: FastifyInstance) {
    fastify.get(
        '/users',
        {
            preHandler: requireAdmin,
        },
        async () => {
            if (fastify.dbBackend === 'postgres' && fastify.pg) {
                const { rows } = await fastify.pg.pool.query(
                    `SELECT id, username, email, role, status, webhook_ttl_seconds AS "webhookTTL",
                            reason, rejection_reason AS "rejectionReason", created_at AS "createdAt",
                            approved_at AS "approvedAt", rejected_at AS "rejectedAt"
                     FROM users ORDER BY created_at DESC`
                );
                const users = rows.map((r: any) => ({
                    _id: r.id,
                    username: r.username,
                    email: r.email,
                    role: r.role,
                    status: r.status,
                    webhookTTL: r.webhookTTL,
                    reason: r.reason,
                    rejectionReason: r.rejectionReason,
                    createdAt: r.createdAt,
                    approvedAt: r.approvedAt,
                    rejectedAt: r.rejectedAt,
                }));
                return { users };
            }

            const users = await fastify.mongo!.db
                .collection('users')
                .find({}, { projection: { password: 0 } })
                .toArray();

            return { users };
        }
    );

    fastify.post(
        '/users/:userId/approve',
        {
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };

            const result = await fastify.authService.approveUser(userId);

            if (!result) {
                return reply.status(404).send({ error: 'User not found' });
            }

            return { message: 'User approved successfully', userId };
        }
    );

    fastify.post(
        '/users/:userId/reject',
        {
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };
            const { reason } = request.body as { reason?: string };

            const result = await fastify.authService.rejectUser(userId, reason);

            if (!result) {
                return reply.status(404).send({ error: 'User not found' });
            }

            return { message: 'User rejected', userId };
        }
    );

    fastify.delete(
        '/users/:userId',
        {
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };

            const user = await fastify.authService.getUserById(userId);
            if (user?.username === 'admin') {
                return reply.status(403).send({
                    error: 'Cannot delete default admin user',
                });
            }

            const ok = await fastify.authService.deleteUser(userId);

            if (!ok) {
                return reply.status(404).send({ error: 'User not found' });
            }

            return { message: 'User deleted successfully', userId };
        }
    );

    fastify.patch(
        '/users/:userId/ttl',
        {
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const { userId } = request.params as { userId: string };
            const { ttl } = request.body as { ttl: number };

            if (ttl < 60 || ttl > 86400) {
                return reply.status(400).send({
                    error: 'TTL must be between 60s and 86400s (1 day)',
                });
            }

            await fastify.authService.updateUserTTL(userId, ttl);
            return { message: 'TTL updated successfully', ttl };
        }
    );

    fastify.get(
        '/stats',
        {
            preHandler: requireAdmin,
        },
        async () => {
            if (fastify.dbBackend === 'postgres' && fastify.pg) {
                const byStatus = await fastify.pg.pool.query(
                    `SELECT status AS "_id", COUNT(*)::int AS count FROM users GROUP BY status`
                );
                const rooms = await fastify.pg.pool.query(`SELECT COUNT(*)::int AS c FROM rooms`);
                const webhooks = await fastify.pg.pool.query(`SELECT COUNT(*)::int AS c FROM webhooks`);
                const acc: Record<string, number> = {};
                for (const row of byStatus.rows) {
                    acc[row._id] = row.count;
                }
                return {
                    users: acc,
                    rooms: rooms.rows[0].c,
                    webhooks: webhooks.rows[0].c,
                };
            }

            const users = await fastify.mongo!.db
                .collection('users')
                .aggregate([
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                        },
                    },
                ])
                .toArray();

            const rooms = await fastify.mongo!.db.collection('rooms').countDocuments();

            const webhooks = await fastify.mongo!.db.collection('webhooks').countDocuments();

            return {
                users: users?.reduce((acc: Record<string, number>, item: any) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                rooms,
                webhooks,
            };
        }
    );
}
