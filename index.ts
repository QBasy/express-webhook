import express, {Request, Response, Application} from 'express';
import {router} from "./src/router/webhook";

const app: Application = express();
const PORT = 6005;

app.use(express.json());

app.use(router)

app.listen(PORT, () => {
    console.log(`Стартанул на порту ${PORT}`);
})