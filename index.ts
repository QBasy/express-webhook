import express, {Request, Response, Application} from 'express';
import { webhookRepo } from "./src/repository/webhook";

const app: Application = express();
const PORT = 6005;

app.use(express.json());

app.get("/", async (req: Request, res: Response) => {
    const webhooks = webhookRepo.getWebhooks();
    console.log("Вебхуки получены");
    res.status(200);
    res.send(webhooks);
})

app.post("/", async (req: Request, res: Response) => {
    const webhook = req.body;
    console.log(req.body)
    webhookRepo.addWebhook(webhook);
    console.log("Вебхук добавлен");
    res.status(200);
    res.send()
})

app.delete("/", async (req: Request, res: Response) => {
    webhookRepo.clearWebhooks();
    console.log("Очистили очередь вебхуков");
    res.status(200);
    res.send()
})

app.listen(PORT, () => {
    console.log(`Стартанул на порту ${PORT}`);
})