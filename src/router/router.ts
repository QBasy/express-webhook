import express, { Request, Response } from "express";
import cors from "cors";
import {webhookRouter} from "./webhookRouter";
import {roomRouter} from "./roomRouter";
import * as path from "node:path";

export const router = express.Router();

router.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

router.use(express.json());

router.use("/hook", webhookRouter);

router.use("/room", roomRouter);

router.get("/", (req: Request, res: Response)=> {
    res.sendFile(path.join(__dirname, '..' , 'static', 'webhook_page.html'));
})