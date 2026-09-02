import { FastifyInstance } from 'fastify';
import { requireTrustedIntegration } from '../auth/integrationAuth';
import { logger } from '../utils/logger';

const DEFAULT_WEBHOOK_TTL = 43200; // 12h — тот же дефолт, что у обычных пользователей (см. authService).
const ROOM_ID_RE = /^[A-Za-z0-9_-]{3,64}$/;

// Комнаты, созданные через эту ручку, ничьи в смысле обычного логина —
// помечаем синтетическим userId, чтобы они не терялись: getAllRooms()
// (админская панель "Все комнаты") показывает вообще все комнаты независимо
// от userId, так что такие комнаты всё равно видны и открываемы админом.
const INTEGRATION_OWNER_ID = 'integration-api';

export async function integrationRoutes(fastify: FastifyInstance) {
    fastify.post('/rooms/:id', {
        preHandler: requireTrustedIntegration
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = (request.body ?? {}) as { webhookTTL?: number };

        if (!ROOM_ID_RE.test(id)) {
            return reply.status(400).send({
                error: 'roomId must be 3-64 characters, letters/digits/underscore/hyphen only'
            });
        }

        const webhookTTL = Number.isFinite(body.webhookTTL) && body.webhookTTL! > 0
            ? Math.floor(body.webhookTTL!)
            : DEFAULT_WEBHOOK_TTL;

        await fastify.roomRepo.createRoom(id, INTEGRATION_OWNER_ID, webhookTTL);
        logger.info(`Room ${id} created via integration API`);

        const origin = `${request.protocol}://${request.hostname}`;
        const webhookUrl = `${origin}/hook/${id}`;
        const publicViewUrl = `${origin}/webhooks/${id}`;
        const iframeSnippet = `<iframe src="${publicViewUrl}" style="width:100%;height:480px;border:0"></iframe>`;

        return reply.status(200).send({
            roomId: id,
            webhookTTL,
            webhookUrl,
            publicViewUrl,
            iframeSnippet
        });
    });
}
