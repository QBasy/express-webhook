import { FastifyRequest, FastifyReply } from 'fastify';
import type { User } from '../types/fastify';

export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const decoded = await request.jwtVerify<{ userId: string; username: string; role: string }>();

        const fullUser = await request.server.authService.getUserById(decoded.userId);

        if (!fullUser || !fullUser.isActive) {
            return reply.status(401).send({ error: 'User not found or inactive' });
        }

        request.user = {
            ...fullUser,
            userId: fullUser._id.toString() // ← конвертируем ObjectId в string
        };
    } catch (err) {
        return reply.status(401).send({ error: 'Invalid or expired token' });
    }
}
export async function requireAdmin(
    request: FastifyRequest,
    reply: FastifyReply
) {
    await authenticate(request, reply);

    if (request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
    }
}

export async function validateAdminToken(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const token = request.headers['x-admin-token'];

    if (!token || token !== process.env.ADMIN_TOKEN) {
        return reply.status(403).send({ error: 'Invalid admin token' });
    }
}