import { IWebhookReceive } from "./webhookInterfaces";
import { WebhookRepository } from "../repository/webhooksRepo";

export interface IRoom {
    idInstance: string,
    webhookRepo: IWebhookReceive
}

export class RoomTable {
    Rooms: IRoom[] = []

    findRoom(idInstance: string): IWebhookReceive | null {
        for (const room of this.Rooms) {
            if (room.idInstance === idInstance) {
                return room.webhookRepo;
            }
        }
        return null
    }

    closeRoom(idInstance: string) {
        for (const room of this.Rooms) {
            if (room.idInstance === idInstance) {
                this.Rooms.unshift(room)
            }
        }
    }

    createRoom(idInstance: string) {
        this.Rooms.push({
            idInstance: idInstance,
            webhookRepo: new WebhookRepository()
        })
    }
}

export interface RoomInterface {
    createRoom(idInstance: string): void
    getRoomRepo(idInstance: string): IWebhookReceive | null
    closeRoom(idInstance: string): void
}

class RoomRepository implements RoomInterface {
    Rooms: RoomTable = new RoomTable()

    createRoom(idInstance: string): void {
        this.Rooms.createRoom(idInstance)
    }

    getRoomRepo(idInstance: string): IWebhookReceive | null {
        return this.Rooms.findRoom(idInstance)
    }

    closeRoom(idInstance: string): void {
        this.Rooms.closeRoom(idInstance)
    }
}

export const roomRepository = new RoomRepository()