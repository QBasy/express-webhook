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

    async getUserRooms(userId: string, isAdmin: boolean): Promise<Room[]> {
        const filter = isAdmin ? {} : { userId };
        return await this.roomsCollection
            .find(filter)
            .sort({ createdAt: -1 })
            .toArray() as Room[];
    }

    async getAllRooms(): Promise<Array<{ roomId: string; webhooksCount: number }>> {
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
            }
        ];

        return await this.roomsCollection.aggregate(pipeline).toArray() as any[];
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

    async setFakeError(roomId: string, enabled: boolean, statusCode?: number): Promise<void> {
        await this.fakeErrorsCollection.updateOne(
            { roomId },
            {
                $set: {
                    enabled,
                    statusCode: enabled ? (statusCode || 500) : null,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        logger.info(`Fake error for ${roomId}: ${enabled ? `ON (${statusCode || 500})` : "OFF"}`);
    }

    async getFakeErrorStatus(roomId: string): Promise<{ enabled: boolean; statusCode: number | null }> {
        const result = await this.fakeErrorsCollection.findOne({ roomId });
        return result
            ? { enabled: result.enabled, statusCode: result.statusCode }
            : { enabled: false, statusCode: null };
    }
}