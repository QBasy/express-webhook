import { FastifyInstance } from "fastify";
import { roomRoutes } from "./roomRouter";
import { webhookRoutes } from "./webhookRouter";
import path from "path";
import fs from "fs";

function sendStaticFile(reply: any, filePath: string, type: string) {
    try {
        const absPath = path.join(__dirname, "..", "static", filePath);
        const content = fs.readFileSync(absPath, "utf-8");
        reply.type(type).send(content);
    } catch (err) {
        reply.code(404).send("File not found");
    }
}

export async function registerRoutes(fastify: FastifyInstance) {
    fastify.register(roomRoutes, { prefix: "/room" });
    fastify.register(webhookRoutes, { prefix: "/hook" });

    const htmlPages = [
        "/", "login", "login.html", "register", "register.html", "json-compare.html",
        "admin", "admin.html", "docs", "tester", "tester.html", "navbar.html"
    ];

    htmlPages.forEach(page => {
        const routePath = page === "/" ? "/" : `/${page}`;
        const filename = page === "/" ? "webhook_page.html" :
            page.replace("/", "").replace(".html", "") + ".html";

        fastify.get(routePath, async (_, reply) => {
            sendStaticFile(reply, filename, "text/html");
        });
    });

    const jsFiles = ["auth-check.js", "navbar-loader.js"];

    jsFiles.forEach(script => {
        fastify.get(`/${script}`, async (_, reply) => {
            sendStaticFile(reply, script, "application/javascript");
        });
    });

    fastify.get("/favicon.ico", async (_, reply) => {
        const filePath = path.join(__dirname, "..", "static", "favicon.ico");
        try {
            const data = fs.readFileSync(filePath);
            reply.type("image/x-icon").send(data);
        } catch {
            reply.code(404).send();
        }
    });

    fastify.get("/favicon", async (_, reply) => {
        const filePath = path.join(__dirname, "..", "static", "favicon.ico");
        try {
            const data = fs.readFileSync(filePath);
            reply.type("image/x-icon").send(data);
        } catch {
            reply.code(404).send();
        }
    });

    fastify.get("/health", async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    }));
}