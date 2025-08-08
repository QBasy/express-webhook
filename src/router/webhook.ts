import express, { Request, Response } from "express";
import {roomRepository} from "../repository/roomRepo";

export const webhookRouter = express.Router();

webhookRouter.get("/:id", async (req: Request, res: Response) => {
    const instanceId = req.params.id
    try {
        const webhooks = (await roomRepository.getRoomRepo(instanceId))?.getWebhooks();
        console.log("Вебхуки получены");
        res.status(200);
        res.send(webhooks);
    } catch (e) {
        res.status(500);
        res.send();
    }
})

webhookRouter.post("/:id", async (req: Request, res: Response) => {
    const instanceId = req.params.id
    const webhook = req.body;
    console.log(req.body)
    try {
        (await roomRepository.getRoomRepo(instanceId))?.addWebhook(webhook);
        console.log("Вебхук добавлен");
    } catch (e) {
        res.status(500);
        res.send()
        return
    } finally {
        res.status(200);
        res.send()
    }
})

webhookRouter.delete("/:id", async (req: Request, res: Response) => {
    const instanceId = req.params.id
    try {
        (await roomRepository.getRoomRepo(instanceId))?.clearWebhooks();
        console.log("Очистили очередь вебхуков");
        res.status(200);
        res.send()
    } catch (e) {
        res.status(500);
        res.send()
    }
})