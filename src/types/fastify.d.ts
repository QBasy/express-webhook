import 'fastify';
import '@fastify/jwt';
import type { Db } from 'mongodb';
import type { ObjectId } from 'mongodb';
import type { Pool } from 'pg';
import type { AuthService } from '../auth/authService';
import type { AuthServicePostgres } from '../auth/authServicePostgres';
import type { RoomRepository } from '../repository/roomRepo';
import type { RoomRepositoryPostgres } from '../repository/roomRepoPostgres';
import type { WebhookRepository } from '../repository/webhooksRepo';
import type { WebhookRepositoryPostgres } from '../repository/webhooksRepoPostgres';

export interface User {
    _id: ObjectId | string;
    username: string;
    email?: string;
    password: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'rejected';
    webhookTTL: number;
    reason?: string;
    rejectionReason?: string;
    createdAt: Date;
    approvedAt?: Date;
    rejectedAt?: Date;
}

export type DatabaseBackend = 'mongo' | 'postgres';

declare module 'fastify' {
    interface FastifyInstance {
        dbBackend: DatabaseBackend;
        mongo?: { db: Db };
        pg?: { pool: Pool };
        authService: AuthService | AuthServicePostgres;
        roomRepo: RoomRepository | RoomRepositoryPostgres;
        webhookRepo: WebhookRepository | WebhookRepositoryPostgres;
        jwt: {
            sign: (payload: any, options?: any) => string;
            verify: (token: string, options?: any) => any;
        };
    }

    interface FastifyRequest {
        user?: User;
        jwtVerify<Decoded = any>(): Promise<Decoded>;
    }

    interface FastifyReply {
        jwtSign(payload: any, options?: any): Promise<string>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            userId: string;
            username: string;
            role: 'admin' | 'user';
        };
        user: User;
    }
}
