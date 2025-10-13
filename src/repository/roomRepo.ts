import { InMemoryWebhookRepository, IWebhookRepository } from "./webhooksRepo";
import { logger } from "../utils/logger";

export interface IRoomRepository {
    createRoom(idInstance: string): Promise<void>;
    getRoomRepo(idInstance: string): Promise<IWebhookRepository | null>;
    getAllRoomIds(): Promise<string[]>;
    closeRoom(idInstance: string): Promise<void>;
    setFakeError(id: string, enabled: boolean): Promise<void>;
    isFakeErrorEnabled(id: string): Promise<boolean>;
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
        const rooms: string[] = [];

        for (const [key, value] of this.roomsMap.entries()) {
            logger.info(`Room ID: ${key}, Webhooks count: ${value.getWebhooks().length}`);
            rooms.push(key);
        }

        return rooms;
    }

    async closeRoom(idInstance: string) {
        this.roomsMap.delete(idInstance);
        logger.info(`Room closed for ID: ${idInstance}`);
    }

    async setFakeError(id: string, enabled: boolean) {
        const room = this.roomsMap.get(id);
        if (room) {
            room.fakeError = enabled;
        }
    }

    async isFakeErrorEnabled(id: string) {
        const room = this.roomsMap.get(id);
        return room?.fakeError ?? false;
    }
}

export const roomRepository: IRoomRepository = new InMemoryRoomRepository();
