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

    fastify.get("/login", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "login.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/login.html", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "login.html"),
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/register", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "register.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/register.html", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "register.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/admin", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "admin.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/admin.html", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "admin.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/docs", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "docs.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/tester", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "tester.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    fastify.get("/tester.html", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "tester.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    // Navbar
    fastify.get("/navbar.html", async (request, reply) => {
        const html = fs.readFileSync(
            path.join(__dirname, "..", "static", "navbar.html"),
            "utf-8"
        );
        reply.type("text/html").send(html);
    });

    // Auth check script
    fastify.get("/auth-check.js", async (request, reply) => {
        const js = fs.readFileSync(
            path.join(__dirname, "..", "static", "auth-check.js"),
            "utf-8"
        );
        reply.type("application/javascript").send(js);
    });

    // Favicon
    fastify.get("/favicon", async (request, reply) => {
        const favicon = fs.readFileSync(
            path.join(__dirname, "..", "static", "favicon.ico")
        );
        reply.type("image/x-icon").send(favicon);
    });

    // Health check
    fastify.get("/health", async (request, reply) => {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    });
}