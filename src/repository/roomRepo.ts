import { Collection, ObjectId } from 'mongodb';
import { logger } from '../utils/logger';

export interface Room {
    _id?: ObjectId;
    roomId: string;
    userId: string;
    webhookTTL: number;
    createdAt: Date;
    lastActivityAt: Date;
}

export class RoomRepository {
    constructor(
        private roomsCollection: Collection,
        private fakeErrorsCollection: Collection
    ) {}

    async createRoom(roomId: string, userId: string, webhookTTL: number): Promise<void> {
        await this.roomsCollection.updateOne(
            { roomId },
            {
                $set: {
                    roomId,
                    userId,
                    webhookTTL,
                    lastActivityAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
        logger.info(`Room ${roomId} created/updated for user ${userId}`);
    }

    async getRoom(roomId: string): Promise<Room | null> {
        return await this.roomsCollection.findOne({ roomId }) as Room | null;
    }

    async getUserRooms(
        userId: string,
        isAdmin: boolean,
        page = 1,
        limit = 10
    ): Promise<{ rooms: Room[]; total: number; page: number; totalPages: number }> {
        const filter = isAdmin ? {} : { userId };

        const total = await this.roomsCollection.countDocuments(filter);
        const rooms = await this.roomsCollection
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray() as Room[];

        return {
            rooms,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getAllRooms(
        page = 1,
        limit = 10
    ): Promise<{
        rooms: Array<{ roomId: string; webhooksCount: number }>;
        total: number;
        page: number;
        totalPages: number;
    }> {
        const pipeline = [
            {
                $lookup: {
                    from: 'webhooks',
                    localField: 'roomId',
                    foreignField: 'roomId',
                    as: 'webhooks'
                }
            },
            {
                $project: {
                    roomId: 1,
                    webhooksCount: { $size: '$webhooks' }
                }
            },
            { $sort: { roomId: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ];

        const rooms = (await this.roomsCollection
            .aggregate(pipeline)
            .toArray()) as Array<{ roomId: string; webhooksCount: number }>;

        const total = await this.roomsCollection.countDocuments();

        return {
            rooms,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async closeRoom(roomId: string): Promise<void> {
        await Promise.all([
            this.roomsCollection.deleteOne({ roomId }),
            this.fakeErrorsCollection.deleteOne({ roomId })
        ]);
        logger.info(`Room ${roomId} closed`);
    }

    async updateActivity(roomId: string): Promise<void> {
        await this.roomsCollection.updateOne(
            { roomId },
            { $set: { lastActivityAt: new Date() } }
        );
    }

    async setFakeError(roomId: string, enabled: boolean, statusCode?: number, force?: boolean): Promise<void> {
        await this.fakeErrorsCollection.updateOne(
            { roomId },
            {
                $set: {
                    enabled,
                    statusCode: enabled ? (statusCode || 500) : null,
                    force: enabled ? !!force : false,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        logger.info(
            `Fake error for ${roomId}: ${enabled ? `ON (${statusCode || 500}) force=${!!force}` : "OFF"}`
        );
    }

    async getFakeErrorStatus(roomId: string): Promise<{ enabled: boolean; statusCode: number | null; force: boolean }> {
        const result = await this.fakeErrorsCollection.findOne({ roomId });
        return result
            ? { enabled: result.enabled, statusCode: result.statusCode, force: !!result.force }
            : { enabled: false, statusCode: null, force: false };
    }
}
