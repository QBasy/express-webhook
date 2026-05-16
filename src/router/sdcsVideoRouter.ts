import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fs from "fs";
import path from "path";

const DEFAULT_YOUTUBE_VIDEO_ID = "CViEs3hTNfU";

function staticDir(): string {
    return path.join(__dirname, "..", "static");
}

/** ID из watch-ссылки, youtu.be, embed или голого 11-символьного id. */
export function extractYoutubeVideoId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^[\w-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    try {
        const u = new URL(trimmed);
        const host = u.hostname.replace(/^www\./, "");

        if (host === "youtu.be") {
            const id = u.pathname.replace(/^\//, "").split("/")[0];
            return id && /^[\w-]{11}$/.test(id) ? id : null;
        }

        if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
            const v = u.searchParams.get("v");
            if (v && /^[\w-]{11}$/.test(v)) return v;

            const embed = u.pathname.match(/\/embed\/([\w-]{11})/);
            if (embed) return embed[1];

            const shorts = u.pathname.match(/\/shorts\/([\w-]{11})/);
            if (shorts) return shorts[1];
        }
    } catch {
        return null;
    }

    return null;
}

function resolveYoutubeVideoId(): string {
    const candidates = [
        process.env.SDCS_YOUTUBE_VIDEO_ID,
        process.env.SDCS_YOUTUBE_URL,
    ];

    for (const raw of candidates) {
        if (!raw?.trim()) continue;
        const id = extractYoutubeVideoId(raw.trim());
        if (id) return id;
    }

    return DEFAULT_YOUTUBE_VIDEO_ID;
}

function sendSdcsPage(reply: FastifyReply): void {
    const absPath = path.join(staticDir(), "sdcs-video.html");
    const videoId = resolveYoutubeVideoId();

    try {
        const content = fs
            .readFileSync(absPath, "utf-8")
            .replace(/__SDCS_YOUTUBE_VIDEO_ID__/g, videoId);
        reply.type("text/html; charset=utf-8").send(content);
    } catch {
        reply.code(404).send("SDCS page not found");
    }
}

export async function sdcsVideoRoutes(fastify: FastifyInstance) {
    fastify.get("/sdcs/video", async (_request: FastifyRequest, reply: FastifyReply) => {
        sendSdcsPage(reply);
    });
}
