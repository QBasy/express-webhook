import 'fastify';
import '@fastify/jwt';
import { Db, ObjectId } from 'mongodb';
import { AuthService } from '../auth/authService';
import { RoomRepository } from '../repository/roomRepo';
import { WebhookRepository } from '../repository/webhookRepo';

export interface User {
    _id: ObjectId;
    username: string;
    password: string;
    role: 'admin' | 'user';
    webhookTTL: number;
    createdAt: Date;
    isActive: boolean;
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
        user?: AuthenticatedUser;
        jwtVerify<Decoded = { userId: string; username: string; role: string }>(): Promise<Decoded>;
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
        user: {
            userId: string;
            username: string;
            role: 'admin' | 'user';
        };
    }
}