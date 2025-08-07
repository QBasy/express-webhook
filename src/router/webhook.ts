import express, { Request, Response } from "express";
import { webhookRepo } from "../repository/webhooksRepo";

export const router = express().router

router.get("/", async (req: Request, res: Response) => {
    const webhooks = webhookRepo.getWebhooks();
    console.log("Вебхуки получены");
    res.status(200);
    res.send(webhooks);
})

router.post("/", async (req: Request, res: Response) => {
    const webhook = req.body;
    console.log(req.body)
    webhookRepo.addWebhook(webhook);
    console.log("Вебхук добавлен");
    res.status(200);
    res.send()
})

router.delete("/", async (req: Request, res: Response) => {
    webhookRepo.clearWebhooks();
    console.log("Очистили очередь вебхуков");
    res.status(200);
    res.send()
})