import type { RequestHandler } from '@sveltejs/kit';

const TARGET = import.meta.env.VITE_API_URL;

async function proxyRequest(request: Request, path: string, urlSearch: string): Promise<Response> {
    const targetUrl = `${TARGET}/${path}${urlSearch}`;

    const headers = new Headers(request.headers);
    headers.delete('host');

    const body = ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.arrayBuffer();

    const upstream = await fetch(targetUrl, {
        method: request.method,
        headers,
        body
    });

    const respHeaders = new Headers();

    for (const [key, value] of upstream.headers.entries()) {
        respHeaders.set(key, value);
    }

    respHeaders.delete('content-encoding');
    respHeaders.delete('content-length');

    if (!respHeaders.has('content-type') || !respHeaders.get('content-type')?.includes('json')) {
        respHeaders.set('content-type', 'application/json');
    }

    respHeaders.set('access-control-allow-origin', '*');

    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: respHeaders
    });
}

function getPath(params: Record<string, string | string[] | undefined>) {
    const path = params.path;
    const fullPath = Array.isArray(path) ? path : path ? [path] : [];
    return ['hook', ...fullPath].join('/');
}

export const GET: RequestHandler = async ({ params, request, url }) =>
    proxyRequest(request, getPath(params), url.search);
export const POST: RequestHandler = GET;
export const PUT: RequestHandler = GET;
export const PATCH: RequestHandler = GET;
export const DELETE: RequestHandler = GET;
export const OPTIONS: RequestHandler = GET;
