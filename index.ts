import express, { Application } from 'express';
import {webhookRouter} from "./src/router/webhook";
import {roomRouter} from "./src/router/room";

const app: Application = express();
const PORT = 6005;

app.use(express.json());

app.use("/hook", webhookRouter);

app.use("/room", roomRouter)

app.listen(PORT, () => console.log(`Стартанул на порту ${PORT}`));