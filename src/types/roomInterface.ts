import { IWebhookReceive } from "./webhookInterfaces";

export interface IRoom {
    idInstance: string,
    webhookRepo: IWebhookReceive
}

export interface RoomInterface {
    createRoom(idInstance: string): Promise<void>
    getRoomRepo(idInstance: string): Promise<IWebhookReceive | null>
    closeRoom(idInstance: string): Promise<void>
}