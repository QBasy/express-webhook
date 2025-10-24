import 'fastify';
import '@fastify/jwt';
import { Db, ObjectId } from 'mongodb';
import { AuthService } from '../auth/authService';
import { RoomRepository } from '../repository/roomRepo';
import { WebhookRepository } from '../repository/webhookRepo';

export interface User {
    _id: ObjectId;
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

declare module 'fastify' {
    interface FastifyInstance {
        mongo: { db: Db };
        authService: AuthService;
        roomRepo: RoomRepository;
        webhookRepo: WebhookRepository;
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
