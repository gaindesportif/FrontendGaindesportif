import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from './route';

const session = 'synthetic_session_only_for_unit_testing_0000000000';
const user = {
  id: 'owner-test',
  username: 'recette',
  displayName: 'Recette',
  role: 'owner',
  active: true,
  createdAt: '2026-10-19T00:00:00Z',
};
function incoming(
  path: string,
  method = 'GET',
  options: { origin?: string; cookie?: boolean; body?: unknown } = {},
) {
  return new NextRequest(`http://localhost:3000/api/admin/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.origin ? { Origin: options.origin } : {}),
      ...(options.cookie ? { Cookie: `gs_admin_session=${session}` } : {}),
    },
    ...(method === 'POST' || method === 'PATCH'
      ? { body: JSON.stringify(options.body || {}) }
      : {}),
  });
}
function context(path: string) {
  return { params: Promise.resolve({ path: path.split('/') }) };
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('BFF administration', () => {
  it('rejette les routes hors liste blanche et les lectures sans session', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await GET(incoming('health'), context('health'))).status).toBe(404);
    expect((await GET(incoming('products'), context('products'))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('exige une origine exacte sur les mutations, y compris la connexion', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const origin of [
      undefined,
      'https://external.example',
      'http://localhost:3000.evil.example',
      'null',
    ]) {
      expect(
        (await POST(incoming('auth/login', 'POST', { origin }), context('auth/login'))).status,
      ).toBe(403);
    }
    expect(
      (
        await DELETE(
          incoming('products/item', 'DELETE', { cookie: true }),
          context('products/item'),
        )
      ).status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('utilise l’origine publique configurée derrière proxy', async () => {
    vi.stubEnv('BACKEND_URL', 'http://backend:4000');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://gaindesportif.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: session,
            user,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          }),
          { status: 200 },
        ),
      ),
    );
    expect(
      (
        await POST(
          incoming('auth/login', 'POST', { origin: 'http://localhost:3000' }),
          context('auth/login'),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          incoming('auth/login', 'POST', { origin: 'https://gaindesportif.com' }),
          context('auth/login'),
        )
      ).status,
    ).toBe(200);
  });
  it('transforme le token en cookie HttpOnly sécurisé sans le rendre au navigateur en JSON', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BACKEND_URL', 'http://backend:4000');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: session,
            user,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await POST(
      incoming('auth/login', 'POST', {
        origin: 'http://localhost:3000',
        body: { username: 'recette', password: 'synthetic-only-password' },
      }),
      context('auth/login'),
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ user });
    const cookie = result.headers.get('set-cookie');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=lax');
    expect(cookie).toContain('Path=/api/admin');
    expect(result.headers.get('cache-control')).toContain('no-store');
  });
  it('ne transmet que le bearer serveur et les paramètres de lecture autorisés', async () => {
    vi.stubEnv('BACKEND_URL', 'http://backend:4000');
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const request = new NextRequest(
      'http://localhost:3000/api/admin/products?q=maillot&page=2&token=forbidden',
      {
        headers: {
          Cookie: `gs_admin_session=${session}; another=private`,
          'x-arbitrary': 'untrusted',
        },
      },
    );
    const result = await GET(request, context('products'));
    expect(result.status).toBe(200);
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe('http://backend:4000/api/v1/admin/products?page=2&q=maillot');
    expect(init.headers).toEqual({
      Accept: 'application/json',
      Authorization: `Bearer ${session}`,
    });
    expect(init.cache).toBe('no-store');
    expect(init.redirect).toBe('error');
  });
  it('refuse les fichiers multipart et les corps JSON volumineux', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `gs_admin_session=${session}`,
        'Content-Type': 'multipart/form-data',
      },
      body: 'synthetic',
    });
    expect((await POST(request, context('products'))).status).toBe(415);
    expect(
      (
        await POST(
          incoming('products', 'POST', {
            cookie: true,
            origin: 'http://localhost:3000',
            body: { description: 'a'.repeat(33000) },
          }),
          context('products'),
        )
      ).status,
    ).toBe(413);
  });
  it('accepte une suppression en attente sans annoncer un succès définitif', async () => {
    vi.stubEnv('BACKEND_URL', 'http://backend:4000');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ deleted: false, pendingMediaCleanup: 1 }), { status: 202 }),
        ),
    );
    const result = await DELETE(
      incoming('products/item', 'DELETE', { cookie: true, origin: 'http://localhost:3000' }),
      context('products/item'),
    );
    expect(result.status).toBe(202);
    expect(await result.json()).toEqual({ deleted: false, pendingMediaCleanup: 1 });
  });
  it('déconnecte sur un 204 et supprime la session expirée sur un 401', async () => {
    vi.stubEnv('BACKEND_URL', 'http://backend:4000');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('upstream sensitive', { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    const logout = await POST(
      incoming('auth/logout', 'POST', { cookie: true, origin: 'http://localhost:3000' }),
      context('auth/logout'),
    );
    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
    const expired = await GET(incoming('auth/me', 'GET', { cookie: true }), context('auth/me'));
    expect(expired.status).toBe(401);
    expect(expired.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(await expired.text()).not.toContain('sensitive');
  });
  it('assainit les erreurs du backend et ne met jamais les réponses en cache', async () => {
    vi.stubEnv('BACKEND_URL', 'http://backend:4000');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('private backend connection details', { status: 500 })),
    );
    const result = await GET(incoming('products', 'GET', { cookie: true }), context('products'));
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('private');
    expect(result.headers.get('cache-control')).toContain('no-store');
  });
});
