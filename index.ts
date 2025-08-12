import express, { Application } from 'express';
import {router} from "./src/router/router";

const app: Application = express();
const PORT = 6005;

app.use("/", router)

app.listen(PORT, () => console.log(`Стартанул на порту ${PORT}`));