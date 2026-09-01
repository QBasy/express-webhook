import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiPost, TOKEN_KEY } from './client';

function mockJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ ok: true })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('does not set Content-Type on a POST with no body (avoids FST_ERR_CTP_EMPTY_JSON_BODY)', async () => {
    await apiPost('/room/test_room');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has('Content-Type')).toBe(false);
    expect(init?.body).toBeUndefined();
  });

  it('sets Content-Type: application/json on a POST that has a body', async () => {
    await apiPost('/room/test_room/fake-error', { enabled: true, statusCode: 500 });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify({ enabled: true, statusCode: 500 }));
  });

  it('does not set Content-Type on a bodyless DELETE', async () => {
    await apiDelete('/room/test_room');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('does not set Content-Type on a GET', async () => {
    await apiGet('/room/my-rooms');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('attaches the bearer token for non-hook paths and omits it for /hook/*', async () => {
    localStorage.setItem(TOKEN_KEY, 'test-token');

    await apiGet('/room/my-rooms');
    const [, roomInit] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(roomInit?.headers).get('Authorization')).toBe('Bearer test-token');

    await apiGet('/hook/all/test_room');
    const [, hookInit] = vi.mocked(fetch).mock.calls[1];
    expect(new Headers(hookInit?.headers).has('Authorization')).toBe(false);
  });
});
