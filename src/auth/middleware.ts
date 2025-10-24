import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const decoded = await request.jwtVerify<{ userId: string; username: string; role: string }>();

        const fullUser = await request.server.authService.getUserById(decoded.userId);

        if (!fullUser) {
            return reply.status(401).send({ error: 'User not found' });
        }

        if (fullUser.status !== 'approved') {
            return reply.status(403).send({
                error: 'User not approved',
                status: fullUser.status
            });
        }

        request.user = fullUser;
    } catch (err) {
        return reply.status(401).send({ error: 'Invalid or expired token' });
    }
}

export async function requireAdmin(
    request: FastifyRequest,
    reply: FastifyReply
) {
    await authenticate(request, reply);

    if (reply.sent) {
        return;
    }

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