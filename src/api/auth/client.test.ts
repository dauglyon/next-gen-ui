import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '../../test/setup';
import {
  AUTH_ORIGIN,
  AuthApiError,
  getAllSessions,
  getTokenInfo,
  logout,
  revokeSession,
  setAuthFailureHandler,
  setMe,
  validateToken,
} from './client';

const ORIGIN = AUTH_ORIGIN;

afterEach(() => {
  setAuthFailureHandler(null);
});

describe('validateToken', () => {
  it('returns null without fetching when token is null', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const me = await validateToken(null);
    expect(me).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('sends Authorization: <raw token> with no Bearer prefix', async () => {
    let captured: string | null = null;
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/me`, ({ request }) => {
        captured = request.headers.get('authorization');
        return HttpResponse.json({ user: 't', display: 'T' });
      }),
    );
    await validateToken('tok-raw-123');
    expect(captured).toBe('tok-raw-123');
    expect(captured).not.toMatch(/^Bearer/i);
  });

  it('returns null on 401 (without throwing)', async () => {
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/me`, () => HttpResponse.json(null, { status: 401 })),
    );
    const me = await validateToken('expired');
    expect(me).toBeNull();
  });

  it('throws AuthApiError on 5xx with the auth-service apperror in message', async () => {
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/me`, () =>
        HttpResponse.json(
          { error: { apperror: 'Service Temporarily Unavailable' } },
          { status: 503 },
        ),
      ),
    );
    await expect(validateToken('tok-x')).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 503,
      message: expect.stringMatching(/503/) as unknown,
    });
    await expect(validateToken('tok-x')).rejects.toMatchObject({
      message: expect.stringContaining('Service Temporarily Unavailable') as unknown,
    });
  });
});

describe('401 interceptor', () => {
  beforeEach(() => {
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/me`, () => HttpResponse.json(null, { status: 401 })),
    );
  });

  it('fires the registered failure handler on a 401 from any auth endpoint', async () => {
    const handler = vi.fn();
    setAuthFailureHandler(handler);
    await validateToken('any');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire the handler on a successful response', async () => {
    server.resetHandlers();
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/me`, () =>
        HttpResponse.json({ user: 't', display: 'T' }),
      ),
    );
    const handler = vi.fn();
    setAuthFailureHandler(handler);
    await validateToken('good');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not require a handler to be set', async () => {
    setAuthFailureHandler(null);
    await expect(validateToken('any')).resolves.toBeNull();
  });

  it('does not fire on 401 from cookie-auth endpoints (getLoginChoice / postLoginPick)', async () => {
    server.resetHandlers();
    server.use(
      http.get(`${ORIGIN}/services/auth/login/choice`, () =>
        HttpResponse.json(null, { status: 401 }),
      ),
      http.post(`${ORIGIN}/services/auth/login/pick`, () =>
        HttpResponse.json(null, { status: 401 }),
      ),
    );
    const handler = vi.fn();
    setAuthFailureHandler(handler);

    await expect((await import('./client')).getLoginChoice()).rejects.toBeInstanceOf(AuthApiError);
    await expect(
      (await import('./client')).postLoginPick({ id: 'x', policyids: [] }),
    ).rejects.toBeInstanceOf(AuthApiError);

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('setMe', () => {
  it('PUTs /services/auth/me with the raw token and JSON body', async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;
    let capturedAuth: string | null = null;
    let capturedBody: unknown = null;
    server.use(
      http.put(`${ORIGIN}/services/auth/me`, async ({ request }) => {
        capturedUrl = request.url;
        capturedMethod = request.method;
        capturedAuth = request.headers.get('authorization');
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await setMe('tok-1', { display: 'New Name', email: 'a@b.co' });
    expect(capturedUrl).toMatch(/\/services\/auth\/me$/);
    expect(capturedMethod).toBe('PUT');
    expect(capturedAuth).toBe('tok-1');
    expect(capturedBody).toEqual({ display: 'New Name', email: 'a@b.co' });
  });

  it('throws AuthApiError on a non-2xx response', async () => {
    server.use(
      http.put(`${ORIGIN}/services/auth/me`, () =>
        HttpResponse.json({ error: { apperror: 'Bad email' } }, { status: 400 }),
      ),
    );
    await expect(setMe('tok-1', { display: 'x', email: 'bad' })).rejects.toBeInstanceOf(
      AuthApiError,
    );
  });
});

describe('revokeSession', () => {
  it('DELETEs /services/auth/tokens/revoke/<id> with the raw token', async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;
    server.use(
      http.delete(`${ORIGIN}/services/auth/tokens/revoke/:id`, ({ request, params }) => {
        capturedUrl = request.url;
        capturedMethod = request.method;
        expect(params.id).toBe('abc123');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await revokeSession('tok-1', 'abc123');
    expect(capturedUrl).toMatch(/\/tokens\/revoke\/abc123$/);
    expect(capturedMethod).toBe('DELETE');
  });

  it('URL-encodes the session id', async () => {
    let captured: string | null = null;
    server.use(
      http.delete(`${ORIGIN}/services/auth/tokens/revoke/:id`, ({ request }) => {
        captured = request.url;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await revokeSession('tok-1', 'has space/and/slash');
    expect(captured).toMatch(/has%20space%2Fand%2Fslash$/);
  });
});

describe('logout', () => {
  it('looks up the current token id then revokes it', async () => {
    let revokedId: string | null = null;
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ id: 'session-xyz', user: 'u' }),
      ),
      http.delete(`${ORIGIN}/services/auth/tokens/revoke/:id`, ({ params }) => {
        revokedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await logout('tok-1');
    expect(revokedId).toBe('session-xyz');
  });

  it('propagates the lookup failure when /api/V2/token errors', async () => {
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ error: { apperror: 'token gone' } }, { status: 401 }),
      ),
    );
    await expect(logout('tok-1')).rejects.toBeInstanceOf(AuthApiError);
  });
});

describe('getAllSessions', () => {
  it('returns the parsed sessions payload', async () => {
    server.use(
      http.get(`${ORIGIN}/services/auth/tokens/`, () =>
        HttpResponse.json({
          current: { id: 'cur', type: 'Login' },
          tokens: [
            { id: 'cur', type: 'Login' },
            { id: 't2', type: 'Login' },
          ],
        }),
      ),
    );
    const out = await getAllSessions('tok');
    expect(out.current.id).toBe('cur');
    expect(out.tokens.length).toBe(2);
  });
});

describe('getTokenInfo', () => {
  it('returns the parsed TokenInfo payload', async () => {
    server.use(
      http.get(`${ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ id: 'tk-1', user: 'u', expires: 12345 }),
      ),
    );
    const info = await getTokenInfo('tok');
    expect(info).toEqual({ id: 'tk-1', user: 'u', expires: 12345 });
  });
});
