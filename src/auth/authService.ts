import bcrypt from 'bcryptjs';
import { Collection, ObjectId } from 'mongodb';
import { logger } from '../utils/logger';

export type { User } from '../types/fastify';
import type { User } from '../types/fastify';

export class AuthService {
    constructor(private usersCollection: Collection) {}

    async createUser(
        username: string,
        password: string,
        role: 'admin' | 'user' = 'user',
        webhookTTL: number = 43200
    ): Promise<{ userId: string }> {
        const exists = await this.usersCollection.findOne({ username });
        if (exists) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await this.usersCollection.insertOne({
            username,
            password: hashedPassword,
            role,
            webhookTTL,
            createdAt: new Date(),
            isActive: true
        });

        logger.info(`User created: ${username} (${role})`);
        return { userId: result.insertedId.toString() };
    }

    async authenticate(username: string, password: string): Promise<User | null> {
        const user = await this.usersCollection.findOne({
            username,
            isActive: true
        }) as User | null;

        if (!user) {
            logger.warn(`Failed login attempt for: ${username}`);
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            logger.warn(`Invalid password for: ${username}`);
            return null;
        }

        logger.info(`User authenticated: ${username}`);
        return user;
    }

    async getUserById(userId: string): Promise<User | null> {
        return await this.usersCollection.findOne({
            _id: new ObjectId(userId)
        }) as User | null;
    }

    async updateUserTTL(userId: string, ttl: number): Promise<void> {
        await this.usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { webhookTTL: ttl } }
        );
        logger.info(`TTL updated for user ${userId}: ${ttl}s`);
    }
}