import { FastifyRequest, FastifyReply } from 'fastify';

// Доступ для доверенного бэкенда партнёра/своей инфраструктуры — без логина,
// без JWT. Вместо этого две независимые проверки (обе опциональны по
// отдельности, но хотя бы одна ДОЛЖНА быть настроена, иначе роут наглухо
// закрыт — открытая ручка создания комнат без единой проверки недопустима):
//
// 1) INTEGRATION_API_KEY — общий секрет в заголовке X-Integration-Key.
//    Это единственная проверка, которая реально что-то доказывает: секрет
//    знает только доверенный вызывающий.
// 2) INTEGRATION_TRUSTED_HOSTS — список хостов через запятую. Хост берётся
//    из Origin, затем Referer, затем заголовка X-Integration-Host (последний
//    нужен для серверных вызовов: Origin/Referer — заголовки, которые сам
//    браузер подставляет для веб-страниц, а сторонний бэкенд их сам по себе
//    не шлёт, если явно не настроен).
//
// ВАЖНО: Origin/Referer — это то, что прислал сам вызывающий, их легко
// подделать вне браузера (curl, Postman, другой сервер). Эта проверка не
// заменяет API-ключ, а дополняет его — для случая, когда запрос идёт из
// браузера с сайта партнёра, и как read-only sanity check. Если нужна
// настоящая защита — обязательно настрой INTEGRATION_API_KEY.
function parseTrustedHosts(): Set<string> {
    const raw = process.env.INTEGRATION_TRUSTED_HOSTS?.trim();
    if (!raw) return new Set();
    return new Set(
        raw.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
    );
}

function extractHost(value: string | undefined): string | null {
    if (!value) return null;
    try {
        return new URL(value).hostname.toLowerCase();
    } catch {
        // Не URL — считаем, что это уже голый хост (для X-Integration-Host).
        return value.trim().toLowerCase() || null;
    }
}

export async function requireTrustedIntegration(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const apiKey = process.env.INTEGRATION_API_KEY?.trim();
    const trustedHosts = parseTrustedHosts();

    if (!apiKey && trustedHosts.size === 0) {
        return reply.status(503).send({
            error: 'Integration API is not configured (set INTEGRATION_API_KEY and/or INTEGRATION_TRUSTED_HOSTS)'
        });
    }

    if (apiKey) {
        const provided = request.headers['x-integration-key'];
        if (provided !== apiKey) {
            return reply.status(403).send({ error: 'Invalid or missing X-Integration-Key' });
        }
    }

    if (trustedHosts.size > 0) {
        const host =
            extractHost(request.headers['origin'] as string | undefined) ??
            extractHost(request.headers['referer'] as string | undefined) ??
            extractHost(request.headers['x-integration-host'] as string | undefined);

        if (!host || !trustedHosts.has(host)) {
            return reply.status(403).send({ error: 'Request host is not on the trusted list' });
        }
    }
}
