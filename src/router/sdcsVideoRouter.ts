import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fs from "fs";
import path from "path";

function staticDir(): string {
    return path.join(__dirname, "..", "static");
}

const MIME_BY_EXT: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
};

function sendSdcsPage(reply: FastifyReply): void {
    const absPath = path.join(staticDir(), "sdcs-video.html");
    try {
        const content = fs.readFileSync(absPath, "utf-8");
        reply.type("text/html; charset=utf-8").send(content);
    } catch {
        reply.code(404).send("SDCS page not found");
    }
}

/** Имя файла только в `static/` (без подкаталогов и `..`), из `SDCS_VIDEO_FILE`. */
function resolveStaticVideo(): { filePath: string; mime: string } | null {
    const raw = process.env.SDCS_VIDEO_FILE?.trim();
    if (!raw) {
        return null;
    }

    const normalized = raw.replace(/\\/g, "/");
    if (normalized.includes("/") || normalized.includes("..")) {
        return null;
    }

    const name = path.basename(normalized);
    if (!name || name !== normalized) {
        return null;
    }

    const filePath = path.join(staticDir(), name);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return null;
    }

    try {
        const realStatic = fs.realpathSync(staticDir());
        const realFile = fs.realpathSync(filePath);
        const rel = path.relative(realStatic, realFile);
        if (rel.startsWith("..") || path.isAbsolute(rel)) {
            return null;
        }
    } catch {
        return null;
    }

    const ext = path.extname(name).toLowerCase();
    const mime = MIME_BY_EXT[ext] || "application/octet-stream";

    return { filePath, mime };
}

export async function sdcsVideoRoutes(fastify: FastifyInstance) {
    fastify.get("/sdcs/video", async (_request: FastifyRequest, reply: FastifyReply) => {
        sendSdcsPage(reply);
    });

    fastify.get("/sdcs/video/stream", async (request: FastifyRequest, reply: FastifyReply) => {
        const resolved = resolveStaticVideo();
        if (!resolved) {
            return reply.code(503).send({
                error: "Video unavailable",
                hint: "Set SDCS_VIDEO_FILE to a filename in static (e.g. promo.mp4). Put the file next to sdcs-video.html under src/static.",
            });
        }

        const { filePath: videoPath, mime } = resolved;
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = request.headers.range;

        if (range) {
            const m = /^bytes=(\d*)-(\d*)$/.exec(range);
            if (!m) {
                return reply.code(416).send("Invalid Range");
            }
            const start = m[1] ? parseInt(m[1], 10) : 0;
            let end = m[2] ? parseInt(m[2], 10) : fileSize - 1;
            if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
                return reply.code(416).header("Content-Range", `bytes */${fileSize}`).send();
            }
            end = Math.min(end, fileSize - 1);
            const chunkSize = end - start + 1;

            reply
                .code(206)
                .header("Content-Range", `bytes ${start}-${end}/${fileSize}`)
                .header("Accept-Ranges", "bytes")
                .header("Content-Length", chunkSize)
                .type(mime);

            return reply.send(fs.createReadStream(videoPath, { start, end }));
        }

        reply.header("Accept-Ranges", "bytes").header("Content-Length", fileSize).type(mime);

        return reply.send(fs.createReadStream(videoPath));
    });
}
