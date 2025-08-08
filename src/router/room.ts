import express, { Request, Response } from "express";
import {roomRepository} from "../repository/roomRepo";

export const roomRouter = express.Router()

roomRouter.use("/room")

roomRouter.post("/:id", async (req: Request, res: Response)=> {
    const instanceId = req.params.id
    try {
        await roomRepository.createRoom(instanceId)
        res.status(200)
        res.send(JSON.stringify({roomId: instanceId}))
    } catch (e) {
        res.status(500)
        res.send(JSON.stringify({"info": "FAILED"}))
    }
});

roomRouter.delete("/:id", async (req: Request, res: Response)=> {
    const instanceId = req.params.id
    try {
        await roomRepository.closeRoom(instanceId)
        res.status(200)
        res.send(JSON.stringify({"info": `successfully created room for ${instanceId}`, roomId: instanceId}))
    } catch (e) {
        res.status(500)
        res.send(JSON.stringify({"info": "FAILED"}))
    }
});