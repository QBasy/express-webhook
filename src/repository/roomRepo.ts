// src/repository/roomRepo.ts
import { InMemoryWebhookRepository, IWebhookRepository } from "./webhooksRepo";
import {logger} from "../utils/logger";

export interface IRoomRepository {
    createRoom(idInstance: string): Promise<void>;
    getRoomRepo(idInstance: string): Promise<IWebhookRepository | null>;
    getAllRoomIds(): Promise<string[]>;
    closeRoom(idInstance: string): Promise<void>;
}

class InMemoryRoomRepository implements IRoomRepository {
    private roomsMap = new Map<string, IWebhookRepository>();

    async createRoom(idInstance: string) {
        if (!this.roomsMap.has(idInstance)) {
            this.roomsMap.set(idInstance, new InMemoryWebhookRepository());
            logger.info(`Room created for ID: ${idInstance}`);
        }
    }
    async getRoomRepo(idInstance: string) {
        return this.roomsMap.get(idInstance) ?? null;
    }
    async getAllRoomIds() {
        logger.info(`Current rooms: ${[...this.roomsMap.keys()]}`);
        let rooms: string[] = [];
        this.roomsMap.forEach((value, key) => {
            logger.info(`Room ID: ${key}`);
            logger.info(`Webhooks count: ${value.getWebhooks().length}`);
            rooms.push(key);
        });
        return [...rooms];
    }
    async closeRoom(idInstance: string) {
        this.roomsMap.delete(idInstance);
        logger.info(`Room closed for ID: ${idInstance}`);
    }
}

export const roomRepository: IRoomRepository = new InMemoryRoomRepository();
