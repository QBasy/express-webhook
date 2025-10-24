import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

let db: Db | null = null;
let client: MongoClient | null = null;

export async function connectMongoDB(uri: string): Promise<Db> {
    if (db) return db;

    try {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db();

        logger.info('✅ Connected to MongoDB');

        // ✅ Создаем TTL индексы
        await createIndexes();

        return db;
    } catch (error) {
        logger.error(`❌ MongoDB connection failed: ${error}`);
        process.exit(1);
    }
}

async function createIndexes() {
    if (!db) return;

    try {
        // TTL индекс для webhooks (автоудаление через N секунд)
        await db.collection('webhooks').createIndex(
            { createdAt: 1 },
            {
                expireAfterSeconds: parseInt(process.env.DEFAULT_WEBHOOK_TTL || '43200'),
                name: 'webhook_ttl_index'
            }
        );
        logger.info('✅ TTL index created for webhooks');

        // Индекс для быстрого поиска webhooks по roomId
        await db.collection('webhooks').createIndex(
            { roomId: 1, createdAt: -1 },
            { name: 'room_created_index' }
        );

        // Уникальный индекс для комнат
        await db.collection('rooms').createIndex(
            { roomId: 1 },
            { unique: true, name: 'room_unique' }
        );

        // Индекс для поиска комнат по userId
        await db.collection('rooms').createIndex(
            { userId: 1 },
            { name: 'user_rooms_index' }
        );

        // Уникальный индекс для username
        await db.collection('users').createIndex(
            { username: 1 },
            { unique: true, name: 'user_username_unique' }
        );

        logger.info('✅ All indexes created successfully');
    } catch (error) {
        logger.error(`❌ Error creating indexes: ${error}`, );
    }
}

export function getDB(): Db {
    if (!db) {
        throw new Error('Database not initialized. Call connectMongoDB() first.');
    }
    return db;
}

// Graceful shutdown
export async function closeMongoDB() {
    if (client) {
        await client.close();
        logger.info('✅ MongoDB connection closed');
    }
}