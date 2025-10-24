import { Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export async function runMigrations(db: Db) {
    logger.info('Running migrations...');

    const adminExists = await db.collection('users').findOne({ username: 'admin' });

    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await db.collection('users').insertOne({
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            webhookTTL: 43200,
            createdAt: new Date(),
            isActive: true
        });
        logger.info('✅ Admin user created (username: admin, password: admin)');
    } else {
        logger.info('✅ Admin user already exists');
    }

    try {
        await db.collection('webhooks').createIndex(
            { createdAt: 1 },
            {
                expireAfterSeconds: parseInt(process.env.DEFAULT_WEBHOOK_TTL || '43200'),
                name: 'webhook_ttl_index'
            }
        );

        await db.collection('webhooks').createIndex(
            { roomId: 1, createdAt: -1 },
            { name: 'room_created_index' }
        );

        await db.collection('rooms').createIndex(
            { roomId: 1 },
            { unique: true, name: 'room_unique' }
        );

        await db.collection('rooms').createIndex(
            { userId: 1 },
            { name: 'user_rooms_index' }
        );

        await db.collection('users').createIndex(
            { username: 1 },
            { unique: true, name: 'user_username_unique' }
        );

        logger.info('✅ All indexes created/verified');
    } catch (error) {
        logger.warn('Some indexes already exist, skipping...');
    }

    logger.info('✅ Migrations completed successfully');
}
