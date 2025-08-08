import express, { Request, Response } from "express";
import {roomRepository} from "../repository/roomRepo";

export const roomRouter = express.Router()

roomRouter.post("/:id", async (req: Request, res: Response)=> {
    const instanceId = req.params.id
    try {
        await roomRepository.createRoom(instanceId)

        res.status(200)
        res.send(JSON.stringify({roomId: instanceId, fullUrl: `http://142.93.101.58:6005/hook/${instanceId}`}))
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

roomRouter.get("/all", async (req: Request, res: Response) => {
    try {
        const rooms = await roomRepository.getAllRoomIds();

        res.status(200)
        res.send(rooms)
    } catch (e) {
        res.status(500)
        res.send(JSON.stringify({"info": "FAILED"}))
    }
})