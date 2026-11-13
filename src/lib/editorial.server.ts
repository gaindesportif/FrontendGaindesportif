import 'server-only';
import { articleSchema, articleListSchema } from './editorial';
import { backendClientHeaders } from './backend-request.server';
export const mediaPublicEnabled = () => process.env.MEDIA_PUBLIC_ENABLED === 'true';
export class ArticleNotFound extends Error {}
export async function readArticles(path: string, incoming?: Headers) {
  if (!mediaPublicEnabled()) throw new ArticleNotFound();
  const backend = process.env.BACKEND_URL;
  if (!backend) throw new Error('Service indisponible');
  const url = new URL(backend);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Service indisponible');
  const response = await fetch(`${url.href.replace(/\/$/, '')}/api/v1/articles${path}`, {
    cache: 'no-store',
    redirect: 'error',
    headers: { Accept: 'application/json', ...backendClientHeaders(incoming) },
    signal: AbortSignal.timeout(12000),
  });
  if (response.status === 404) throw new ArticleNotFound();
  if (!response.ok) throw new Error('Service indisponible');
  return (await response.json()) as unknown;
}
export async function getArticle(slug: string, incoming?: Headers) {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) throw new ArticleNotFound();
  return articleSchema.parse(await readArticles(`/${slug}`, incoming));
}
export async function getArticles(query: URLSearchParams, incoming?: Headers) {
  return articleListSchema.parse(await readArticles(`?${query}`, incoming));
}
