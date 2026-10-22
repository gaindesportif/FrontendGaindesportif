import { NextRequest, NextResponse } from 'next/server';
import { backendClientHeaders } from '@/lib/backend-request.server';

export const dynamic = 'force-dynamic';
const COOKIE = 'gs_admin_session';
const ID = '[A-Za-z0-9_-]{1,96}';
const allowedRoutes: Array<[RegExp, readonly string[]]> = [
  [/^auth\/login$/, ['POST']],
  [/^auth\/me$/, ['GET']],
  [/^auth\/(logout|password)$/, ['POST']],
  [/^accounts$/, ['GET', 'POST']],
  [/^customer-requests$/, ['GET']],
  [new RegExp(`^customer-requests/${ID}/status$`), ['PATCH']],
  [new RegExp(`^accounts/${ID}$`), ['PATCH']],
  [/^products$/, ['GET', 'POST']],
  [/^categories$/, ['GET', 'POST']],
  [new RegExp(`^products/${ID}$`), ['GET', 'PATCH', 'DELETE']],
  [/^media\/config$/, ['GET']],
  [new RegExp(`^products/${ID}/media/upload-signature$`), ['POST']],
  [new RegExp(`^products/${ID}/media/${ID}/confirm$`), ['POST']],
  [new RegExp(`^products/${ID}/media/${ID}$`), ['PATCH', 'DELETE']],
];
type Context = { params: Promise<{ path: string[] }> };
const responseHeaders = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: responseHeaders });
}
function clearSession(response: NextResponse) {
  response.cookies.set(COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/admin',
    maxAge: 0,
  });
  return response;
}
function validOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const allowed = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
    return ['http:', 'https:'].includes(new URL(origin).protocol) && origin === allowed;
  } catch {
    return false;
  }
}
function errorMessage(status: number, path: string): string {
  if (status === 401)
    return path === 'auth/login'
      ? 'Identifiant ou mot de passe incorrect.'
      : 'Votre session a expiré. Reconnectez-vous.';
  if (status === 403) return 'Ce compte n’est pas autorisé à effectuer cette action.';
  if (status === 404) return 'Cet élément n’existe plus ou n’est pas accessible.';
  if (status === 409 && path === 'categories')
    return 'Cette catégorie existe déjà. Sélectionnez-la dans la liste.';
  if (status === 409)
    return 'Cette modification est impossible dans l’état actuel. Vérifiez les données et rechargez.';
  if (status === 429) return 'Trop de tentatives. Patientez avant de réessayer.';
  if (status === 400 || status === 422) {
    if (path === 'auth/login') return 'Vérifiez l’identifiant et le mot de passe.';
    if (path === 'auth/password')
      return 'Vérifiez le mot de passe actuel et le nouveau mot de passe (12 caractères minimum).';
    if (path === 'categories') return 'Renseignez un nom de catégorie valide (2 à 80 caractères).';
    if (path.startsWith('accounts'))
      return 'Vérifiez l’identifiant, le nom et le mot de passe (12 caractères minimum).';
    if (path.includes('media/'))
      return 'Vérifiez le type, la taille et les informations du média, puis réessayez.';
    return 'Vérifiez les champs. Pour publier, renseignez le prix, le stock, la catégorie et au moins une photo.';
  }
  if (path.includes('media/'))
    return 'Les médias sont indisponibles. Vous pouvez conserver le produit en brouillon et réessayer plus tard.';
  return 'Le service boutique est indisponible. Cette action n’a pas pu être confirmée.';
}

async function proxy(request: NextRequest, context: Context) {
  const { path: parts } = await context.params;
  const path = parts.join('/');
  const rule = allowedRoutes.find(([pattern]) => pattern.test(path));
  if (!rule) return json({ message: 'Route indisponible.' }, 404);
  if (!rule[1].includes(request.method)) return json({ message: 'Méthode non autorisée.' }, 405);
  if (request.method !== 'GET' && !validOrigin(request))
    return json({ message: 'Origine non autorisée.' }, 403);
  const token = request.cookies.get(COOKIE)?.value;
  if (path !== 'auth/login' && !token)
    return json({ message: 'Connectez-vous pour continuer.' }, 401);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...backendClientHeaders(request.headers),
  };
  if (path !== 'auth/login' && token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  if (['POST', 'PATCH'].includes(request.method)) {
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      return json({ message: 'Format non autorisé.' }, 415);
    if (Number(request.headers.get('content-length') || 0) > 32768)
      return json({ message: 'Données trop volumineuses.' }, 413);
    try {
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 32768)
        return json({ message: 'Données trop volumineuses.' }, 413);
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    } catch {
      return json({ message: 'Données illisibles.' }, 400);
    }
    headers['Content-Type'] = 'application/json';
  }
  try {
    const backend = process.env.BACKEND_URL;
    if (!backend) return json({ message: errorMessage(503, path) }, 503);
    const url = new URL(`${backend.replace(/\/$/, '')}/api/v1/admin/${path}`);
    for (const key of ['page', 'pageSize', 'q', 'category']) {
      const value = request.nextUrl.searchParams.get(key);
      if (value !== null) url.searchParams.set(key, value);
    }
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(25000),
    });
    if (!upstream.ok) {
      const status = [400, 401, 403, 404, 409, 422, 429].includes(upstream.status)
        ? upstream.status
        : 503;
      const response = json({ message: errorMessage(status, path) }, status);
      if (status === 429) response.headers.set('Retry-After', '60');
      return status === 401 && path !== 'auth/login' ? clearSession(response) : response;
    }
    if (path === 'auth/logout')
      return clearSession(new NextResponse(null, { status: 204, headers: responseHeaders }));
    const data = await upstream.json();
    if (path === 'auth/login') {
      const expires = new Date(data.expiresAt);
      if (
        typeof data.token !== 'string' ||
        !/^[A-Za-z0-9_-]{24,512}$/.test(data.token) ||
        !Number.isFinite(expires.getTime()) ||
        expires.getTime() <= Date.now() ||
        !data.user?.id
      )
        throw new Error();
      const response = json({ user: data.user });
      response.cookies.set(COOKIE, data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/admin',
        expires,
        priority: 'high',
      });
      return response;
    }
    return json(data, upstream.status);
  } catch {
    return json({ message: errorMessage(503, path) }, 503);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
