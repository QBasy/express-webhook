// src/db/migrations.ts
import { Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export async function runMigrations(db: Db) {
    logger.info('Running migrations...');

    // Migration 1: Ensure admin user exists with correct structure
    const adminExists = await db.collection('users').findOne({ username: 'admin' });

    if (!adminExists) {
        // Создаем нового admin пользователя с правильной структурой
        const hashedPassword = await bcrypt.hash('admin', 10);
        await db.collection('users').insertOne({
            username: 'admin',
            email: 'admin@webhook-viewer.local',
            password: hashedPassword,
            role: 'admin',
            status: 'approved', // ← ВАЖНО: должен быть approved
            webhookTTL: 43200,
            createdAt: new Date(),
            approvedAt: new Date() // ← Сразу одобрен
        });
        logger.info('✅ Admin user created (username: admin, password: admin)');
    } else {
        // Проверяем и обновляем существующего admin если нужно
        if (!adminExists.status || adminExists.isActive !== undefined) {
            logger.info('🔄 Updating admin user structure...');

            await db.collection('users').updateOne(
                { username: 'admin' },
                {
                    $set: {
                        status: 'approved',
                        email: adminExists.email || 'admin@webhook-viewer.local',
                        approvedAt: adminExists.approvedAt || new Date()
                    },
                    $unset: {
                        isActive: '' // Удаляем старое поле
                    }
                }
            );

            logger.info('✅ Admin user structure updated');
        } else {
            logger.info('✅ Admin user already exists with correct structure');
        }
    }

    // Migration 2: Update all users - remove isActive, add status if missing
    const usersWithOldStructure = await db.collection('users').find({
        $or: [
            { isActive: { $exists: true } },
            { status: { $exists: false } }
        ]
    }).toArray();

    if (usersWithOldStructure.length > 0) {
        logger.info(`🔄 Migrating ${usersWithOldStructure.length} users to new structure...`);

        for (const user of usersWithOldStructure) {
            const updates: any = {};
            const unsets: any = {};

            // Удаляем isActive
            if (user.isActive !== undefined) {
                unsets.isActive = '';
            }

            // Добавляем status если его нет
            if (!user.status) {
                // Если был isActive: true - делаем approved, иначе pending
                updates.status = user.isActive === true ? 'approved' : 'pending';

                if (updates.status === 'approved' && !user.approvedAt) {
                    updates.approvedAt = new Date();
                }
            }

            // Добавляем email если его нет
            if (!user.email) {
                updates.email = `${user.username}@webhook-viewer.local`;
            }

            const updateDoc: any = {};
            if (Object.keys(updates).length > 0) updateDoc.$set = updates;
            if (Object.keys(unsets).length > 0) updateDoc.$unset = unsets;

            if (Object.keys(updateDoc).length > 0) {
                await db.collection('users').updateOne(
                    { _id: user._id },
                    updateDoc
                );
            }
        }

        logger.info('✅ All users migrated to new structure');
    }

    // Migration 3: Ensure indexes exist
    try {
        // Webhooks TTL index
        await db.collection('webhooks').createIndex(
            { expiresAt: 1 },
            {
                expireAfterSeconds: 0,
                name: 'webhook_ttl_index'
            }
        );

        // Webhooks by room index
        await db.collection('webhooks').createIndex(
            { roomId: 1, timestamp: -1 },
            { name: 'room_timestamp_index' }
        );

        // Room unique index
        await db.collection('rooms').createIndex(
            { roomId: 1 },
            { unique: true, name: 'room_unique' }
        );

        // User rooms index
        await db.collection('rooms').createIndex(
            { userId: 1 },
            { name: 'user_rooms_index' }
        );

        // Username unique index
        await db.collection('users').createIndex(
            { username: 1 },
            { unique: true, name: 'user_username_unique' }
        );

        // Email unique index
        await db.collection('users').createIndex(
            { email: 1 },
            { unique: true, sparse: true, name: 'user_email_unique' }
        );

        // User status index
        await db.collection('users').createIndex(
            { status: 1 },
            { name: 'user_status_index' }
        );

        logger.info('✅ All indexes created/verified');
    } catch (error: any) {
        if (error.code === 11000 || error.codeName === 'IndexOptionsConflict') {
            logger.warn('Some indexes already exist with different options, skipping...');
        } else {
            logger.warn('Index creation warning:', error.message);
        }
    }

    logger.info('✅ Migrations completed successfully');
}
