import 'dotenv/config';

import dns from 'node:dns';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { connectMongoDB, closeMongoDB } from './src/db/connection';
import { runMigrations } from './src/db/migrations';
import { connectPostgres, closePostgres } from './src/db/postgresPool';
import { runPostgresMigrations } from './src/db/migrationsPostgres';
import { getDatabaseBackend } from './src/config/databaseBackend';
import { AuthService } from './src/auth/authService';
import { AuthServicePostgres } from './src/auth/authServicePostgres';
import { RoomRepository } from './src/repository/roomRepo';
import { RoomRepositoryPostgres } from './src/repository/roomRepoPostgres';
import { WebhookRepository } from './src/repository/webhooksRepo';
import { WebhookRepositoryPostgres } from './src/repository/webhooksRepoPostgres';
import { registerRoutes } from './src/router';
import { authRoutes } from './src/router/authRouter';
import { adminRoutes } from './src/auth/adminRoutes';
import { integrationRoutes } from './src/router/integrationRouter';
import { logger } from './src/utils/logger';

/** Render и др. часто без IPv6 egress; Supabase отдаёт AAAA → ENETUNREACH. См. DNS_DEFAULT_RESULT_ORDER в .env.supabase */
function configureDns(): void {
    const order = process.env.DNS_DEFAULT_RESULT_ORDER?.trim().toLowerCase();
    if (order === 'verbatim' || order === 'ipv6first' || order === 'ipv4first') {
        dns.setDefaultResultOrder(order);
        return;
    }
    dns.setDefaultResultOrder('ipv4first');
}

async function start() {
    configureDns();
    const app = Fastify({
        logger: {
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
            transport:
                process.env.NODE_ENV !== 'production'
                    ? {
                          target: 'pino-pretty',
                      }
                    : undefined,
        },
    });

    const backend = getDatabaseBackend();

    try {
        logger.info(`Database backend: ${backend}`);
        logger.info('Checking environment variables...');

        if (backend === 'mongo') {
            if (!process.env.MONGODB_URI) {
                logger.error('MONGODB_URI not set (required when DATABASE_BACKEND=mongo).');
                logger.error('Use DATABASE_BACKEND=postgres and DATABASE_URL for Render PostgreSQL.');
                process.exit(1);
            }
            const safeUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
            logger.info(`MongoDB URI: ${safeUri}`);

            logger.info('Connecting to MongoDB...');
            const db = await connectMongoDB();
            app.decorate('mongo', { db });
            app.decorate('dbBackend', 'mongo' as const);
            logger.info('MongoDB connected');

            await runMigrations(db);
            logger.info('MongoDB migrations completed');

            await app.register(jwt, {
                secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
                sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
            });

            const authService = new AuthService(db.collection('users'), (payload: any) => app.jwt.sign(payload));
            const roomRepo = new RoomRepository(db.collection('rooms'), db.collection('fake_errors'));
            const webhookRepo = new WebhookRepository(db.collection('webhooks'));

            app.decorate('authService', authService);
            app.decorate('roomRepo', roomRepo);
            app.decorate('webhookRepo', webhookRepo);
        } else {
            if (!process.env.DATABASE_URL) {
                logger.error('DATABASE_URL not set (required when DATABASE_BACKEND=postgres).');
                process.exit(1);
            }

            const safe = process.env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
            logger.info(`PostgreSQL URL: ${safe}`);

            const pool = await connectPostgres();
            app.decorate('pg', { pool });
            app.decorate('dbBackend', 'postgres' as const);
            logger.info('PostgreSQL connected');

            await runPostgresMigrations(pool);

            await app.register(jwt, {
                secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
                sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
            });

            const authService = new AuthServicePostgres(pool, (payload: any) => app.jwt.sign(payload));
            const roomRepo = new RoomRepositoryPostgres(pool);
            const webhookRepo = new WebhookRepositoryPostgres(pool);

            app.decorate('authService', authService);
            app.decorate('roomRepo', roomRepo);
            app.decorate('webhookRepo', webhookRepo);
        }

        logger.info('Services initialized');

        await app.register(cors, {
            origin: true,
            credentials: true,
        });

        await app.register(authRoutes, { prefix: '/auth' });
        await app.register(adminRoutes, { prefix: '/admin' });
        await app.register(integrationRoutes, { prefix: '/integration' });
        await app.register(registerRoutes);

        const signals = ['SIGINT', 'SIGTERM'] as const;
        for (const signal of signals) {
            process.on(signal, async () => {
                logger.info(`Received ${signal}, closing gracefully...`);
                await app.close();
                if (backend === 'mongo') {
                    await closeMongoDB();
                } else {
                    await closePostgres();
                }
                process.exit(0);
            });
        }

        const PORT = Number(process.env.PORT) || 6005;
        await app.listen({ port: PORT, host: '0.0.0.0' });

        logger.info('');
        logger.info('='.repeat(60));
        logger.info(`Server started (${backend})`);
        logger.info('='.repeat(60));
        logger.info(`Main App:       http://localhost:${PORT}/`);
        logger.info(`Login:          http://localhost:${PORT}/login.html`);
        logger.info(`Register:       http://localhost:${PORT}/register.html`);
        logger.info(`Admin Panel:    http://localhost:${PORT}/admin.html`);
        logger.info(`API Tester:     http://localhost:${PORT}/tester.html`);
        logger.info(`API Docs:       http://localhost:${PORT}/docs`);
        logger.info(`Health Check:   http://localhost:${PORT}/health`);
        logger.info('='.repeat(60));
        logger.info('');
    } catch (err: any) {
        logger.error('FAILED to start server');
        logger.error(`Error: ${err}`);

        if (backend === 'mongo') {
            if (err.message?.includes('ECONNREFUSED')) {
                logger.error('MongoDB connection refused — check MONGODB_URI and network access.');
            } else if (err.message?.includes('Authentication failed')) {
                logger.error('MongoDB authentication failed.');
            }
            await closeMongoDB();
        } else {
            await closePostgres();
        }
        process.exit(1);
    }
}

start();
