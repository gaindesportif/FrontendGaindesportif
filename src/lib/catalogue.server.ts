import { catalogueCategories, catalogueResponseSchema, publicProductSchema } from '@/lib/catalogue';
import { backendClientHeaders } from '@/lib/backend-request.server';

export class CatalogueUnavailable extends Error {}
export class CatalogueNotFound extends Error {}

async function readBackend(path: string, incoming?: Headers) {
  const configured = process.env.BACKEND_URL;
  if (!configured) throw new CatalogueUnavailable();
  const backend = new URL(configured);
  if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password) {
    throw new CatalogueUnavailable();
  }
  const response = await fetch(`${backend.href.replace(/\/$/, '')}/api/v1/products${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json', ...backendClientHeaders(incoming) },
    signal: AbortSignal.timeout(12000),
    redirect: 'error',
  });
  if (response.status === 404) throw new CatalogueNotFound();
  if (!response.ok) throw new CatalogueUnavailable();
  const body = await response.text();
  if (body.length > 2_000_000) throw new CatalogueUnavailable();
  return JSON.parse(body) as unknown;
}

export async function fetchCatalogue(searchParams: URLSearchParams, incoming?: Headers) {
  const query = new URLSearchParams({ pageSize: '24' });
  const page = Number(searchParams.get('page') || '1');
  query.set('page', Number.isSafeInteger(page) && page > 0 && page <= 100000 ? String(page) : '1');
  const search = searchParams.get('q')?.trim().slice(0, 100);
  if (search) query.set('q', search);
  const category = searchParams.get('category');
  if (catalogueCategories.some((item) => item.value === category)) query.set('category', category!);
  return catalogueResponseSchema.parse(await readBackend(`?${query}`, incoming));
}

export async function fetchCatalogueProduct(slug: string, incoming?: Headers) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 220) {
    throw new CatalogueNotFound();
  }
  return publicProductSchema.parse(await readBackend(`/${encodeURIComponent(slug)}`, incoming));
}
