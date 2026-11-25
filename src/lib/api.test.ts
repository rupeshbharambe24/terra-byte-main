import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, UNAUTHORIZED_EVENT, adminApi, api, apiUrl, authApi, tokenStore } from './api';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('builds URLs under the API base', () => {
    expect(apiUrl('/me')).toBe('/api/me');
    expect(apiUrl('me')).toBe('/api/me');
  });

  it('attaches the bearer token and JSON body', async () => {
    tokenStore.set('tok-123');
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await api.post('/things', { a: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/things');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
  });

  it('does not send the token to login', async () => {
    tokenStore.set('old-token');
    fetchMock.mockResolvedValue(jsonResponse(200, { access_token: 'x', user: {} }));
    await authApi.login('9876543210', 'pw');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('serialises query parameters and skips empty ones', async () => {
    tokenStore.set('t');
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], total: 0, limit: 20, offset: 0 }));
    await adminApi.listUsers({ role: 'vendor', status: '', q: 'pune', limit: 20 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/users?role=vendor&q=pune&limit=20');
  });

  it('throws a typed ApiError with code and field errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        detail: 'Some fields are invalid.',
        code: 'validation_error',
        errors: [{ field: 'phone', message: 'bad' }],
      })
    );
    const err = (await api.get("/x").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe('validation_error');
    expect(err.fieldErrors).toEqual([{ field: 'phone', message: 'bad' }]);
  });

  it('falls back to an http_<status> code for non-JSON errors', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 502 }));
    const err = (await api.get("/x").catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('http_502');
  });

  it('clears the token and signals on 401', async () => {
    tokenStore.set('expired');
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'expired', code: 'invalid_token' }));
    await expect(api.get('/me')).rejects.toMatchObject({ code: 'invalid_token' });
    expect(tokenStore.get()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it('maps network failures to network_error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 0, code: 'network_error' });
  });

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.post('/notifications/1/read')).resolves.toBeUndefined();
  });
});
