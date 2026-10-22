import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE, PATCH, OPTIONS } from './route';
const session = 'A'.repeat(43);
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'client@example.test',
  displayName: 'Client recette',
  createdAt: '2026-10-21T00:00:00Z',
  emailVerifiedAt: null,
};
const password = 'phrase-secrete-synthetique-uniquement';
const code = 'C'.repeat(43);
const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });
function req(
  path: string,
  method = 'GET',
  body?: unknown,
  options: { origin?: string; cookie?: string; contentType?: string } = {},
) {
  return new NextRequest(`http://localhost:3000/api/customer/${path}`, {
    method,
    headers: {
      ...(options.origin ? { Origin: options.origin } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      'Content-Type': options.contentType || 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const own = { origin: 'http://localhost:3000', cookie: `gs_customer_session=${session}` };
function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  vi.stubEnv('BACKEND_URL', 'http://backend:4000');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('BFF client, protections et projection', () => {
  it('refuse hors allowlist, mauvaise méthode et session admin utilisée comme client', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await GET(req('accounts'), context('accounts'))).status).toBe(404);
    expect((await OPTIONS(req('auth/login', 'OPTIONS'), context('auth/login'))).status).toBe(405);
    expect(
      (
        await GET(
          req('auth/me', 'GET', undefined, { cookie: `gs_admin_session=${session}` }),
          context('auth/me'),
        )
      ).status,
    ).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('exige origine exacte même sur inscription et suppression', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const origin of [
      undefined,
      'null',
      'https://external.example.test',
      'http://localhost:3000.evil.test',
    ]) {
      expect(
        (await POST(req('auth/register', 'POST', {}, { origin }), context('auth/register'))).status,
      ).toBe(403);
      expect(
        (
          await DELETE(
            req('profile', 'DELETE', { password }, { origin, cookie: own.cookie }),
            context('profile'),
          )
        ).status,
      ).toBe(403);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('normalise adresse, crée cookie sécurisé distinct et retire token/hash des réponses', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const fetch = vi.fn().mockResolvedValue(
      response({
        token: session,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        user: { ...user, passwordHash: 'interdit', role: 'owner' },
        verificationQueued: true,
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const result = await POST(
      req(
        'auth/register',
        'POST',
        { email: ' CLIENT@EXAMPLE.TEST ', displayName: 'Client recette', password, consent: true },
        own,
      ),
      context('auth/register'),
    );
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual({ user, verificationQueued: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body).email).toBe('client@example.test');
    const cookie = result.headers.get('set-cookie');
    for (const flag of [
      'gs_customer_session=',
      'HttpOnly',
      'Secure',
      'SameSite=lax',
      'Path=/api/customer',
    ])
      expect(cookie).toContain(flag);
    expect(cookie).not.toContain('gs_admin_session');
    expect(result.headers.get('cache-control')).toContain('no-store');
    expect(result.headers.get('vary')).toBe('Cookie');
  });
  it('refuse consentement manquant, privilèges injectés et corps trop grand avant tout backend', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const body of [
      { email: user.email, displayName: user.displayName, password },
      { email: user.email, displayName: user.displayName, password, consent: true, role: 'admin' },
    ])
      expect(
        (await POST(req('auth/register', 'POST', body, own), context('auth/register'))).status,
      ).toBe(400);
    expect(
      (
        await POST(
          req('auth/login', 'POST', { email: user.email, password: 'a'.repeat(33000) }, own),
          context('auth/login'),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await POST(
          req('auth/login', 'POST', {}, { ...own, contentType: 'text/plain' }),
          context('auth/login'),
        )
      ).status,
    ).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejette token invalide, date expirée ou projection utilisateur malformée du backend', async () => {
    for (const auth of [
      { token: 'bad', expiresAt: new Date(Date.now() + 60000).toISOString(), user },
      { token: session, expiresAt: '2001-01-01T00:00:00Z', user },
      {
        token: session,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        user: { ...user, email: 'bad' },
      },
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(auth)));
      const result = await POST(
        req('auth/login', 'POST', { email: user.email, password }, own),
        context('auth/login'),
      );
      expect(result.status).toBe(503);
      expect(result.headers.get('set-cookie')).toBeNull();
    }
  });
  it('transmet seulement bearer client et interdit données commerciales injectées', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    const id = '33333333-3333-4333-8333-333333333333';
    const result = await PUT(
      req(`wishlist/${id}`, 'PUT', undefined, own),
      context(`wishlist/${id}`),
    );
    expect(result.status).toBe(204);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${session}`);
    expect(fetch.mock.calls[0][1].headers.Cookie).toBeUndefined();
    expect(
      (
        await POST(
          req('requests', 'POST', { productId: id, quantity: 1, requestKey: id, priceXof: 1 }, own),
          context('requests'),
        )
      ).status,
    ).toBe(400);
  });
  it('révoque cookie lors du changement mdp, récupération ou suppression, pas sur panne', async () => {
    for (const [path, method, body, value] of [
      ['auth/password', 'POST', { currentPassword: password, newPassword: password }, { ok: true }],
      ['auth/reset', 'POST', { token: code, newPassword: password }, { ok: true }],
      ['profile', 'DELETE', { password }, { ok: true }],
    ] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(value)));
      const result = await (method === 'DELETE' ? DELETE : POST)(
        req(path, method, body, own),
        context(path),
      );
      expect(result.headers.get('set-cookie')).toContain('Max-Age=0');
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sensitive-upstream-error')));
    const result = await GET(req('wishlist', 'GET', undefined, own), context('wishlist'));
    expect(result.status).toBe(503);
    expect(result.headers.get('set-cookie')).toBeNull();
    expect(await result.text()).not.toContain('sensitive-upstream-error');
  });
  it('refuse faux succès vide pour les ressources attendues et masque messages backend privés', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    expect((await GET(req('history', 'GET', undefined, own), context('history'))).status).toBe(503);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ secret: 'private-error' }, 401)));
    const result = await PATCH(
      req('profile', 'PATCH', { displayName: 'Nouveau nom' }, own),
      context('profile'),
    );
    expect(result.status).toBe(401);
    expect(result.headers.get('set-cookie')).toBeNull();
    expect(await result.text()).not.toContain('private-error');
  });
  it('valide les liens e-mail publics et filtre les réponses sans accepter une destination arbitraire', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => response({ ok: true, token: code, secret: 'never-public' }));
    vi.stubGlobal('fetch', fetch);
    for (const path of ['auth/reset', 'auth/verify']) {
      const body = path === 'auth/reset' ? { token: code, newPassword: password } : { token: code };
      const result = await POST(req(path, 'POST', body, { origin: own.origin }), context(path));
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual({ ok: true });
      expect(
        (
          await POST(
            req(
              path,
              'POST',
              { ...body, redirectUrl: 'https://other.example.test' },
              { origin: own.origin },
            ),
            context(path),
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await POST(
            req(path, 'POST', { ...body, token: 'invalid' }, { origin: own.origin }),
            context(path),
          )
        ).status,
      ).toBe(400);
    }
    fetch.mockResolvedValue(new Response(null, { status: 204 }));
    expect(
      (
        await POST(
          req('auth/forgot', 'POST', { email: user.email }, { origin: own.origin }),
          context('auth/forgot'),
        )
      ).status,
    ).toBe(503);
  });
  it('expose seulement la capacité e-mail publique, sans cookie ni paramètre SMTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response({ emailEnabled: false, SMTP_PASSWORD: 'private-never-public' }),
        ),
    );
    const result = await GET(req('config'), context('config'));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ emailEnabled: false });
    expect(result.headers.get('cache-control')).toContain('no-store');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    expect((await GET(req('config'), context('config'))).status).toBe(503);
  });
});
