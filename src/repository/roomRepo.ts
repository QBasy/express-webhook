// src/repository/roomRepo.ts
import {InMemoryWebhookRepository, IWebhookRepository} from "./webhooksRepo";
import { logger } from "../utils/logger";

interface IRoomInfo {
    roomId: string,
    webhooksCount: number | undefined
}

export interface IRoomRepository {
    createRoom(idInstance: string): Promise<void>;
    getRoomRepo(idInstance: string): Promise<IWebhookRepository | null>;
    getAllRoomIds(): Promise<string[]>;
    closeRoom(idInstance: string): Promise<void>;
    setFakeError(id: string, enabled: boolean, statusCode?: number): Promise<void>;
    getFakeErrorStatus(id: string): Promise<{ enabled: boolean; statusCode: number | null }>;
    getRoomCount(): Promise<number>;
    getAllRooms(): Promise<IRoomInfo[] | null>;
}

class InMemoryRoomRepository implements IRoomRepository {
    private roomsMap = new Map<string, IWebhookRepository>();
    private fakeErrorMap = new Map<string, { enabled: boolean; statusCode: number | null }>();

    async createRoom(idInstance: string) {
        if (!this.roomsMap.has(idInstance)) {
            this.roomsMap.set(idInstance, new InMemoryWebhookRepository());
            this.fakeErrorMap.set(idInstance, { enabled: false, statusCode: null });
            logger.info(`Room created for ID: ${idInstance}`);
        }
    }

    async getRoomRepo(idInstance: string) {
        return this.roomsMap.get(idInstance) ?? null;
    }

    async getAllRoomIds() {
        logger.info(`Current rooms: ${[...this.roomsMap.keys()]}`);
        const rooms: string[] = [];
        for (const [key, value] of this.roomsMap.entries()) {
            logger.info(`Room ID: ${key}, Webhooks count: ${value.getWebhooks().length}`);
            rooms.push(key);
        }
        return rooms;
    }

    async closeRoom(idInstance: string) {
        this.roomsMap.delete(idInstance);
        this.fakeErrorMap.delete(idInstance);
        logger.info(`Room closed for ID: ${idInstance}`);
    }

    async setFakeError(id: string, enabled: boolean, statusCode?: number) {
        const state = this.fakeErrorMap.get(id) || { enabled: false, statusCode: null };
        state.enabled = enabled;
        state.statusCode = enabled ? statusCode ?? 500 : null;
        this.fakeErrorMap.set(id, state);
        logger.info(`Fake error for ${id}: ${enabled ? `ON (${state.statusCode})` : "OFF"}`);
    }

    async getFakeErrorStatus(id: string) {
        return this.fakeErrorMap.get(id) ?? { enabled: false, statusCode: null };
    }

    async getRoomCount(): Promise<number> {
        return this.roomsMap.size
    }

    async getAllRooms(): Promise<IRoomInfo[] | null> {
        let allRooms: IRoomInfo[] = [];
        this.roomsMap.forEach((room, key, value) => {
            const roomWebhooks = value.get(key);
            if (roomWebhooks) {
                allRooms.push({
                    roomId: key,
                    webhooksCount: roomWebhooks.getWebhooks().length,
                })
            } else {
                allRooms.push({
                    roomId: key,
                    webhooksCount: 0
                });
            }
        });
        return allRooms
    }
}

export const roomRepository: IRoomRepository = new InMemoryRoomRepository();
