import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { connectMongoDB } from './src/db/connection';
import { runMigrations } from './src/db/migrations';
import { AuthService } from './src/auth/authService';
import { RoomRepository } from './src/repository/roomRepo';
import { WebhookRepository } from './src/repository/webhooksRepo';
import { registerRoutes } from './src/router';
import { authRoutes } from './src/router/authRouter';
import { adminRoutes } from './src/auth/adminRoutes';
import { logger } from './src/utils/logger';

async function start() {
    const app = Fastify({
        logger: {
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            transport: process.env.NODE_ENV !== 'production' ? {
                target: 'pino-pretty'
            } : undefined
        }
    });

    try {
        logger.info('Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/webhook_viewer';
        const db = await connectMongoDB(mongoUri);

        app.decorate('mongo', { db });
        logger.info('✅ MongoDB connected');

        logger.info('Running migrations...');
        await runMigrations(db);
        logger.info('✅ Migrations completed');

        const authService = new AuthService(db.collection('users'));
        const roomRepo = new RoomRepository(
            db.collection('rooms'),
            db.collection('fake_errors')
        );
        const webhookRepo = new WebhookRepository(db.collection('webhooks'));

        app.decorate('authService', authService);
        app.decorate('roomRepo', roomRepo);
        app.decorate('webhookRepo', webhookRepo);
        logger.info('✅ Services initialized');

        await app.register(jwt, {
            secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
            sign: {
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            }
        });
        logger.info('✅ JWT registered');

        await app.register(cors, {
            origin: true, // В продакшене замените на конкретные домены
            credentials: true
        });
        logger.info('✅ CORS registered');

        await app.register(authRoutes, { prefix: '/auth' });
        await app.register(adminRoutes, { prefix: '/admin' });
        await app.register(registerRoutes); // основные роуты (room, hook, static)
        logger.info('✅ Routes registered');

        const signals = ['SIGINT', 'SIGTERM'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                app.log.info(`Received ${signal}, closing gracefully...`);
                await app.close();
                process.exit(0);
            });
        });

        const PORT = Number(process.env.PORT) || 6005;
        await app.listen({ port: PORT, host: '0.0.0.0' });

        logger.info(`🚀 Server started on http://0.0.0.0:${PORT}`);
        logger.info(`📖 API Docs: http://0.0.0.0:${PORT}/docs`);
        logger.info(`🎯 Webhook Viewer: http://0.0.0.0:${PORT}/`);

    } catch (err) {
        app.log.error(`Failed to start server: ${err}`, );
        process.exit(1);
    }
}

start();