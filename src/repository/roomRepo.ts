import { IWebhookReceive } from "../types/webhookInterfaces";
import { RoomInterface } from "../types/roomInterface";
import { WebhookRepository } from "./webhooksRepo";

export class RoomTable {
    private roomsMap: Map<string, IWebhookReceive> = new Map();

    async findRoom(idInstance: string): Promise<IWebhookReceive | null> {
        return this.roomsMap.get(idInstance) || null;
    }

    async closeRoom(idInstance: string): Promise<void> {
        this.roomsMap.delete(idInstance);
    }

    async findAllRooms(): Promise<string[]> {
        let allRooms: string[] = []
        this.roomsMap.forEach((value, key) => {
            allRooms.push(key);
        });
        return allRooms
    }

    async createRoom(idInstance: string): Promise<void> {
        if (!this.roomsMap.has(idInstance)) {
            this.roomsMap.set(idInstance, new WebhookRepository());
        }
    }
}

class RoomRepository implements RoomInterface {
    private roomTable: RoomTable = new RoomTable();

    async createRoom(idInstance: string): Promise<void> {
        await this.roomTable.createRoom(idInstance);
    }

    async getRoomRepo(idInstance: string): Promise<IWebhookReceive | null> {
        return await this.roomTable.findRoom(idInstance);
    }

    async getAllRoomIds(): Promise<string[]> {
        return await this.roomTable.findAllRooms();
    }

    async closeRoom(idInstance: string): Promise<void> {
        await this.roomTable.closeRoom(idInstance);
    }
}

export const roomRepository = new RoomRepository()