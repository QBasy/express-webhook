import bcrypt from 'bcryptjs';
import { Collection, ObjectId } from 'mongodb';
import { logger } from '../utils/logger';

export type { User } from '../types/fastify';
import type { User } from '../types/fastify';

export class AuthService {
    constructor(
        private usersCollection: Collection,
        private jwtSign: (payload: any) => string
    ) {}

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
            status: 'approved',
            webhookTTL,
            createdAt: new Date()
        });

        logger.info(`User created: ${username} (${role})`);
        return { userId: result.insertedId.toString() };
    }

    async registerUser(
        username: string,
        email: string,
        password: string,
        reason?: string
    ): Promise<string> {
        const existing = await this.usersCollection.findOne({ username });
        if (existing) {
            throw new Error('Username already exists');
        }

        // Проверка: email уже используется?
        const existingEmail = await this.usersCollection.findOne({ email });
        if (existingEmail) {
            throw new Error('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await this.usersCollection.insertOne({
            username,
            email,
            password: hashedPassword,
            role: 'user',
            status: 'pending',
            webhookTTL: 43200,
            reason: reason || null,
            createdAt: new Date()
        });

        logger.info(`New registration request from ${username} (${email})`);
        return result.insertedId.toString();
    }

    async login(username: string, password: string): Promise<{ token: string; user: User }> {
        const user = await this.usersCollection.findOne({ username }) as User | null;

        if (!user) {
            logger.warn(`Login attempt for non-existent user: ${username}`);
            throw new Error('Invalid username or password');
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            logger.warn(`Invalid password for: ${username}`);
            throw new Error('Invalid username or password');
        }

        if (user.status === 'pending') {
            throw new Error('Account pending approval');
        }

        if (user.status === 'rejected') {
            throw new Error('Account has been rejected');
        }

        if (user.status !== 'approved') {
            throw new Error('Account is not approved');
        }

        const token = this.jwtSign({
            userId: user._id.toString(),
            username: user.username,
            role: user.role
        });

        logger.info(`User logged in: ${username}`);

        return { token, user };
    }

    async authenticate(username: string, password: string): Promise<User | null> {
        try {
            const result = await this.login(username, password);
            return result.user;
        } catch {
            return null;
        }
    }

    // Одобрить пользователя
    async approveUser(userId: string): Promise<boolean> {
        const result = await this.usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status: 'approved',
                    approvedAt: new Date()
                }
            }
        );

        if (result.modifiedCount > 0) {
            logger.info(`User ${userId} approved`);
            return true;
        }
        return false;
    }

    // Отклонить пользователя
    async rejectUser(userId: string, reason?: string): Promise<boolean> {
        const result = await this.usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status: 'rejected',
                    rejectedAt: new Date(),
                    rejectionReason: reason || null
                }
            }
        );

        if (result.modifiedCount > 0) {
            logger.info(`User ${userId} rejected`);
            return true;
        }
        return false;
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
