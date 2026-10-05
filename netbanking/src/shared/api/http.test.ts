import { describe, expect, it, vi } from 'vitest';
import { delay, http as rest, HttpResponse } from 'msw';
import { server } from '@shared/test';
import { createHttp, type HttpAuth } from './http';

const BASE = 'http://bank.test';

function setup(overrides: Partial<HttpAuth> = {}) {
  const auth: HttpAuth = {
    getAccessToken: vi.fn(() => 'token-1'),
    refresh: vi.fn(async () => false),
    onUnauthorized: vi.fn(),
    ...overrides,
  };
  return { auth, http: createHttp({ baseUrl: BASE, auth }) };
}

describe('createHttp', () => {
  it('sends JSON with the bearer token, a correlation id and the query string', async () => {
    let seen: Request | undefined;
    server.use(
      rest.post(`${BASE}/thing`, async ({ request }) => {
        seen = request.clone();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { http } = setup();

    const result = await http.send({
      method: 'POST',
      path: '/thing',
      query: { page: 2, skip: undefined },
      body: { a: 1 },
    });

    expect(result._unsafeUnwrap()).toMatchObject({ status: 200, body: { ok: true } });
    expect(new URL(seen!.url).search).toBe('?page=2');
    expect(seen!.headers.get('Authorization')).toBe('Bearer token-1');
    expect(seen!.headers.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(await seen!.json()).toEqual({ a: 1 });
  });

  it('leaves the token off unauthenticated requests', async () => {
    let authorization: string | null = 'unset';
    server.use(
      rest.post(`${BASE}/auth/login`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({});
      }),
    );
    await setup().http.send({ method: 'POST', path: '/auth/login', authenticated: false });
    expect(authorization).toBeNull();
  });

  it('reads HTML error pages as an empty body (MESS-11)', async () => {
    server.use(
      rest.get(`${BASE}/boom`, () =>
        HttpResponse.html('<h1>Service Unavailable</h1>', {
          status: 503,
          headers: { 'Retry-After': '5' },
        }),
      ),
    );
    const result = await setup().http.send({ method: 'GET', path: '/boom' });
    const response = result._unsafeUnwrap();
    expect(response.status).toBe(503);
    expect(response.body).toBeNull();
    expect(response.headers.get('Retry-After')).toBe('5');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    let token = 'old';
    server.use(
      rest.get(`${BASE}/me`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer new'
          ? HttpResponse.json({ me: true })
          : new HttpResponse(null, { status: 401 }),
      ),
    );
    const { http, auth } = setup({
      getAccessToken: () => token,
      refresh: vi.fn(async () => {
        token = 'new';
        return true;
      }),
    });

    const result = await http.send({ method: 'GET', path: '/me' });

    expect(result._unsafeUnwrap().body).toEqual({ me: true });
    expect(auth.refresh).toHaveBeenCalledOnce();
    expect(auth.onUnauthorized).not.toHaveBeenCalled();
  });

  it('reports the session as unauthorised when refreshing fails', async () => {
    server.use(rest.get(`${BASE}/me`, () => new HttpResponse(null, { status: 401 })));
    const { http, auth } = setup();

    const result = await http.send({ method: 'GET', path: '/me' });

    expect(result._unsafeUnwrap().status).toBe(401);
    expect(auth.onUnauthorized).toHaveBeenCalledOnce();
  });

  it('turns a failed fetch into a network failure', async () => {
    server.use(rest.get(`${BASE}/down`, () => HttpResponse.error()));
    const result = await setup().http.send({ method: 'GET', path: '/down' });
    expect(result._unsafeUnwrapErr()).toMatchObject({ kind: 'network', timedOut: false });
  });

  it('gives up on a request that never answers', async () => {
    server.use(
      rest.post(`${BASE}/hang`, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const http = createHttp({ baseUrl: BASE, auth: setup().auth, timeoutMs: 20 });

    const result = await http.send({ method: 'POST', path: '/hang', body: {} });

    expect(result._unsafeUnwrapErr()).toMatchObject({ kind: 'network', timedOut: true });
  });
});
