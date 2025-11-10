import type { RequestHandler } from '@sveltejs/kit';

const TARGET = import.meta.env.VITE_API_URL;

async function proxyRequest(request: Request, path: string, urlSearch: string): Promise<Response> {
    const targetUrl = `${TARGET}/${path}${urlSearch}`;

    const headers = new Headers(request.headers);

    const body = ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.arrayBuffer();

    const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body
    });

    const respHeaders = new Headers(response.headers);
    respHeaders.delete('content-encoding');
    respHeaders.delete('content-length');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders
    });
}

function getPath(params: Record<string, string | string[] | undefined>) {
    const path = params.path;
    const fullPath = Array.isArray(path) ? path : path ? [path] : [];
    return ['auth', ...fullPath].join('/');
}

export const GET: RequestHandler = async ({ params, request, url }) =>
    proxyRequest(request, getPath(params), url.search);
export const POST: RequestHandler = GET;
export const PUT: RequestHandler = GET;
export const PATCH: RequestHandler = GET;
export const DELETE: RequestHandler = GET;
export const OPTIONS: RequestHandler = GET;
