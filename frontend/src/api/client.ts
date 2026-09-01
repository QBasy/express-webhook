import type { ApiErrorPayload } from './types';

export const TOKEN_KEY = 'jwt_token';
export const USER_KEY = 'user';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// AuthContext подписывается сюда один раз при монтировании, чтобы клиент
// мог разлогинить пользователя при 401, не завися от React-дерева напрямую.
let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function buildHeaders(path: string, hasBody: boolean, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getToken();

  // /hook/* — публичный приём вебхуков, авторизация ему не нужна и не должна мешать.
  if (token && !path.startsWith('/hook/')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // Content-Type ставим только когда реально есть тело: fastify парсит JSON по
  // одному наличию заголовка и падает с FST_ERR_CTP_EMPTY_JSON_BODY на пустом
  // теле (актуально для POST/DELETE без body — create room, close room, etc).
  if (hasBody && !headers.has('Content-Type') && !(extra instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: buildHeaders(path, init.body !== undefined, init.headers),
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError('Unauthorized', 401);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object'
        ? (payload as ApiErrorPayload).error ?? (payload as ApiErrorPayload).message
        : undefined;
    throw new ApiError(message || `Request failed (${response.status})`, response.status);
  }

  return payload as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
