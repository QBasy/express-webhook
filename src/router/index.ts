import { FastifyInstance } from "fastify";
import { roomRoutes } from "./roomRouter";
import { webhookRoutes } from "./webhookRouter";
import path from "path";
import fs from "fs";

export async function registerRoutes(fastify: FastifyInstance) {
    fastify.register(roomRoutes, { prefix: "/room" });
    fastify.register(webhookRoutes, { prefix: "/hook" });

    fastify.get("/", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "webhook_page.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });
}
