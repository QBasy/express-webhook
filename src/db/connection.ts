import { MongoClient, Db } from 'mongodb';

let mongoClient: MongoClient | null = null;

export async function connectMongoDB(uri?: string): Promise<Db> {
    const mongoUri = uri || process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error(
            'MONGODB_URI not found!\n' +
            'Please set MONGODB_URI in your .env file'
        );
    }

    const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log('Attempting to connect to MongoDB...');
    console.log(`URI: ${safeUri}`);

    try {
        const client = new MongoClient(mongoUri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            retryReads: true,
            maxPoolSize: 10,
            minPoolSize: 2,
        });

        await client.connect();
        await client.db('admin').command({ ping: 1 });

        // ВАЖНО: Сохраняем клиент для graceful shutdown
        mongoClient = client;

        console.log('MongoDB connected successfully!');

        const dbName = extractDbName(mongoUri);
        console.log(`Using database: ${dbName}`);

        return client.db(dbName);

    } catch (error: any) {
        console.error('❌ MongoDB connection failed!');

        if (error.message?.includes('ECONNREFUSED')) {
            console.error('');
            console.error('Connection refused. Possible causes:');
            console.error('   1. MongoDB server is not running');
            console.error('   2. Wrong host or port in MONGODB_URI');
            console.error('   3. Firewall blocking connection');
            console.error('   4. For Atlas: Check Network Access settings');
            console.error('');
            console.error('Your URI starts with:', mongoUri.substring(0, 30) + '...');

        } else if (error.message?.includes('Authentication failed')) {
            console.error('');
            console.error('Authentication failed. Check:');
            console.error('   1. Username is correct');
            console.error('   2. Password is correct (special chars need URL encoding)');
            console.error('   3. User exists in MongoDB Atlas Database Access');
            console.error('   4. User has proper permissions');

        } else if (error.message?.includes('ETIMEDOUT') || error.message?.includes('ENOTFOUND')) {
            console.error('');
            console.error('Connection timeout. Possible causes:');
            console.error('   1. Internet connection issues');
            console.error('   2. MongoDB Atlas cluster is paused or deleted');
            console.error('   3. Wrong cluster address in URI');
            console.error('   4. Firewall/VPN blocking connection');

        } else if (error.message?.includes('Invalid connection string')) {
            console.error('');
            console.error('Invalid MongoDB URI format. Should be:');
            console.error('   mongodb://host:port/dbname');
            console.error('   OR');
            console.error('   mongodb+srv://user:pass@cluster.mongodb.net/dbname');

        } else {
            console.error('');
            console.error('Unexpected error:', error.message);
        }

        throw error;
    }
}

// Graceful shutdown
export async function closeMongoDB(): Promise<void> {
    if (mongoClient) {
        console.log('Closing MongoDB connection...');
        await mongoClient.close();
        mongoClient = null;
        console.log('MongoDB connection closed');
    }
}

function extractDbName(uri: string): string {
    try {
        let withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, '');

        if (withoutProtocol.includes('@')) {
            withoutProtocol = withoutProtocol.split('@')[1];
        }

        if (withoutProtocol.includes('/')) {
            let dbPart = withoutProtocol.split('/')[1];

            if (dbPart && dbPart.includes('?')) {
                dbPart = dbPart.split('?')[0];
            }

            if (dbPart && dbPart.trim() !== '') {
                return dbPart.trim();
            }
        }

        console.warn('Database name not found in URI, using default: webhook_viewer');
        return 'webhook_viewer';

    } catch (error) {
        console.warn('Failed to parse database name from URI, using default: webhook_viewer');
        return 'webhook_viewer';
    }
}
