import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { GET as GETProduct } from './[slug]/route';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('proxy public de la boutique', () => {
  it('demande une liste fraîche paginée et ne relaie que les filtres autorisés', async () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:4000');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0, page: 2, pageSize: 24 })),
      );
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/catalogue?page=2&q=maillot&category=maillots&status=draft&token=never-relay',
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'http://localhost:4000/api/v1/products?pageSize=24&page=2&q=maillot&category=maillots',
    );
    expect(options.cache).toBe('no-store');
    expect(options.redirect).toBe('error');
    expect(await response.json()).toEqual({ items: [], total: 0, page: 2, pageSize: 24 });
  });

  it('distingue une fiche supprimée d’une panne et masque les erreurs internes', async () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:4000');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    expect(
      (
        await GETProduct(new Request('http://localhost:3000'), {
          params: Promise.resolve({ slug: 'produit-retire' }),
        })
      ).status,
    ).toBe(404);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sensitive upstream details')));
    const response = await GET(new NextRequest('http://localhost:3000/api/catalogue'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('sensitive');
  });

  it('refuse une liste contenant un brouillon plutôt que de la publier', async () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:4000');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [{ status: 'draft', name: 'Donnée privée' }],
            total: 1,
            page: 1,
            pageSize: 24,
          }),
        ),
      ),
    );
    const response = await GET(new NextRequest('http://localhost:3000/api/catalogue'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('Donnée privée');
  });
});
