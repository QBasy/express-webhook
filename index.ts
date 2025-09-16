import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./src/router";

async function start() {
    const app = Fastify({
        logger: {
            level: "info",
            transport: {
                target: "pino-pretty",
                options: {
                    translateTime: "SYS:standard",
                    colorize: true,
                    ignore: "pid,hostname",
                },
            },
        },
    });

    await app.register(cors, {
        origin: "*",
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
    });

    await app.register(registerRoutes);

    const PORT = Number(process.env.PORT) || 6005;
    await app.listen({ port: PORT, host: "0.0.0.0" });

    app.log.info(`🚀 Server started on http://localhost:${PORT}`);
}

start().catch((err) => {
    console.error(err);
    process.exit(1);
});
