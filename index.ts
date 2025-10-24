import 'dotenv/config';

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
        // ✅ 1. Проверка переменных окружения
        logger.info('🔍 Checking environment variables...');

        if (!process.env.MONGODB_URI) {
            logger.error('❌ MONGODB_URI not found in environment variables!');
            logger.error('💡 Please create .env file in project root with:');
            logger.error('   MONGODB_URI=mongodb+srv://...');
            logger.error('');
            logger.error('📄 Example .env file:');
            logger.error('   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname');
            logger.error('   JWT_SECRET=your-secret-key');
            logger.error('   PORT=6005');
            process.exit(1);
        }

        const safeUri = process.env.MONGODB_URI.replace(
            /\/\/([^:]+):([^@]+)@/,
            '//$1:****@'
        );
        logger.info('✅ Environment variables loaded');
        logger.info(`📍 MongoDB URI: ${safeUri}`);

        logger.info('🔗 Connecting to MongoDB...');
        const db = await connectMongoDB();

        app.decorate('mongo', { db });
        logger.info('✅ MongoDB connected successfully');

        logger.info('🔄 Running migrations...');
        await runMigrations(db);
        logger.info('✅ Migrations completed');

        await app.register(jwt, {
            secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
            sign: {
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            }
        });
        logger.info('✅ JWT registered');

        const authService = new AuthService(
            db.collection('users'),
            (payload: any) => app.jwt.sign(payload)
        );
        const roomRepo = new RoomRepository(
            db.collection('rooms'),
            db.collection('fake_errors')
        );
        const webhookRepo = new WebhookRepository(db.collection('webhooks'));

        app.decorate('authService', authService);
        app.decorate('roomRepo', roomRepo);
        app.decorate('webhookRepo', webhookRepo);
        logger.info('✅ Services initialized');

        await app.register(cors, {
            origin: true,
            credentials: true
        });
        logger.info('✅ CORS registered');

        await app.register(authRoutes, { prefix: '/auth' });
        await app.register(adminRoutes, { prefix: '/admin' });
        await app.register(registerRoutes);
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

        logger.info('');
        logger.info('='.repeat(60));
        logger.info(`🚀 Server started successfully!`);
        logger.info('='.repeat(60));
        logger.info(`📍 Main App:       http://localhost:${PORT}/`);
        logger.info(`🔐 Login:          http://localhost:${PORT}/login.html`);
        logger.info(`📝 Register:       http://localhost:${PORT}/register.html`);
        logger.info(`👑 Admin Panel:    http://localhost:${PORT}/admin.html`);
        logger.info(`🧪 API Tester:     http://localhost:${PORT}/tester.html`);
        logger.info(`📖 API Docs:       http://localhost:${PORT}/docs`);
        logger.info(`💚 Health Check:   http://localhost:${PORT}/health`);
        logger.info('='.repeat(60));
        logger.info('');

    } catch (err: any) {
        logger.error('❌ Failed to start server');
        logger.error('Error:', err.message);

        if (err.message?.includes('ECONNREFUSED')) {
            logger.error('');
            logger.error('💡 Connection refused. Possible causes:');
            logger.error('   1. MongoDB is not running');
            logger.error('   2. Wrong MONGODB_URI in .env');
            logger.error('   3. Network/Firewall blocking connection');
            logger.error('   4. Check Network Access in MongoDB Atlas');
        } else if (err.message?.includes('Authentication failed')) {
            logger.error('');
            logger.error('💡 Authentication failed. Check:');
            logger.error('   1. Username and password in MONGODB_URI');
            logger.error('   2. Database Access settings in MongoDB Atlas');
        }

        process.exit(1);
    }
}

start();