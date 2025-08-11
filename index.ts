import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import {webhookRouter} from "./src/router/webhookRouter";
import {roomRouter} from "./src/router/roomRouter";

const app: Application = express();
const PORT = 6005;

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

app.use("/hook", webhookRouter);

app.use("/room", roomRouter)

app.get("/", (req: Request, res: Response)=> {
    res.sendFile(__dirname+"/webhook_page.html");
})

app.listen(PORT, () => console.log(`Стартанул на порту ${PORT}`));