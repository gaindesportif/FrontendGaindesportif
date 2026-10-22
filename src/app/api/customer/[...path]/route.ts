import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { backendClientHeaders } from '@/lib/backend-request.server';
import {
  customerConfigSchema,
  customerHistorySchema,
  customerRequestsSchema,
  customerUserSchema,
  customerWishlistSchema,
} from '@/lib/customer-client';

export const dynamic = 'force-dynamic';
const COOKIE = 'gs_customer_session';
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const password = z.string().min(12).max(128);
const displayName = z.string().trim().min(2).max(100);
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const emailToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const rules: Array<{ pattern: RegExp; methods: string[]; public?: boolean }> = [
  { pattern: /^config$/, methods: ['GET'], public: true },
  { pattern: /^auth\/(register|login|forgot|reset|verify)$/, methods: ['POST'], public: true },
  { pattern: /^auth\/me$/, methods: ['GET'] },
  { pattern: /^auth\/(logout|password|resend-verification)$/, methods: ['POST'] },
  { pattern: /^profile$/, methods: ['PATCH', 'DELETE'] },
  { pattern: /^wishlist$/, methods: ['GET'] },
  { pattern: /^wishlist\/merge$/, methods: ['POST'] },
  { pattern: new RegExp(`^wishlist/${UUID}$`), methods: ['PUT', 'DELETE'] },
  { pattern: /^history$/, methods: ['GET', 'POST', 'DELETE'] },
  { pattern: /^history\/settings$/, methods: ['PATCH'] },
  { pattern: /^requests$/, methods: ['GET', 'POST', 'DELETE'] },
];
const schemas: Record<string, z.ZodType> = {
  'auth/register': z.strictObject({ email, displayName, password, consent: z.literal(true) }),
  'auth/login': z.strictObject({ email, password: z.string().min(1).max(128) }),
  'auth/forgot': z.strictObject({ email }),
  'auth/reset': z.strictObject({ token: emailToken, newPassword: password }),
  'auth/verify': z.strictObject({ token: emailToken }),
  'auth/resend-verification': z.strictObject({}),
  'auth/password': z.strictObject({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
  }),
  'auth/logout': z.strictObject({}),
  'profile:PATCH': z.strictObject({ displayName }),
  'profile:DELETE': z.strictObject({ password: z.string().min(1).max(128) }),
  'wishlist/merge': z.strictObject({ productIds: z.array(z.uuid()).max(100) }),
  'history:POST': z.strictObject({ productId: z.uuid() }),
  'history/settings': z.strictObject({ enabled: z.boolean() }),
  'requests:POST': z.strictObject({
    productId: z.uuid(),
    quantity: z.number().int().min(1).max(99),
    size: z.string().trim().min(1).max(40).optional(),
    color: z.string().trim().min(1).max(40).optional(),
    requestKey: z.uuid(),
  }),
};
type Context = { params: Promise<{ path: string[] }> };
const responseHeaders = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: responseHeaders });
function clearSession(response: NextResponse) {
  response.cookies.set(COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/customer',
    maxAge: 0,
  });
  return response;
}
function validOrigin(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const allowed = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
    return (
      origin !== null &&
      ['http:', 'https:'].includes(new URL(origin).protocol) &&
      origin === allowed
    );
  } catch {
    return false;
  }
}
function errorMessage(status: number, path: string) {
  if (status === 401)
    return ['auth/login'].includes(path)
      ? 'Les informations saisies ne permettent pas de vous connecter. Vérifiez-les et réessayez.'
      : 'Votre session a expiré. Reconnectez-vous pour continuer.';
  if (status === 409)
    return 'Un compte existe peut-être déjà avec cette adresse. Essayez de vous connecter ou de récupérer votre accès.';
  if (status === 429) return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  if (status === 404) return 'Ce produit n’est plus disponible dans la boutique.';
  if (status === 400 || status === 422)
    return ['auth/reset', 'auth/verify'].includes(path)
      ? 'Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien.'
      : 'Vérifiez les champs. Le nouveau mot de passe doit contenir au moins 12 caractères.';
  if (status === 503 && ['auth/forgot', 'auth/resend-verification'].includes(path))
    return 'Le service e-mail est momentanément indisponible. Réessayez plus tard.';
  if (status === 403)
    return 'Cette action n’est pas autorisée. Vérifiez vos informations et réessayez.';
  return 'Votre espace est momentanément indisponible. Réessayez dans quelques instants.';
}
async function readBoundedBody(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 32768) return { status: 413 as const };
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 as const };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 32768) {
        await reader.cancel();
        return { status: 413 as const };
      }
      chunks.push(part.value);
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      data: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined)) as unknown,
    };
  } catch {
    return { status: 400 as const };
  } finally {
    reader.releaseLock();
  }
}
async function proxy(request: NextRequest, context: Context) {
  const { path: parts } = await context.params;
  const path = parts.join('/');
  const rule = rules.find((entry) => entry.pattern.test(path));
  if (!rule) return json({ message: 'Route indisponible.' }, 404);
  if (!rule.methods.includes(request.method))
    return json({ message: 'Méthode non autorisée.' }, 405);
  if (request.method !== 'GET' && !validOrigin(request))
    return json({ message: 'Origine non autorisée.' }, 403);
  const token = request.cookies.get(COOKIE)?.value;
  if (!rule.public && (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)))
    return clearSession(json({ message: 'Connectez-vous pour continuer.' }, 401));
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...backendClientHeaders(request.headers),
  };
  if (!rule.public && token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  const schema = schemas[`${path}:${request.method}`] || schemas[path];
  if (schema) {
    if (
      request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !==
      'application/json'
    )
      return json({ message: 'Format non autorisé.' }, 415);
    const incoming = await readBoundedBody(request);
    if ('status' in incoming)
      return json(
        { message: incoming.status === 413 ? 'Données trop volumineuses.' : 'Données illisibles.' },
        incoming.status,
      );
    const parsed = schema.safeParse(incoming.data);
    if (!parsed.success) return json({ message: errorMessage(400, path) }, 400);
    body = JSON.stringify(parsed.data);
    headers['Content-Type'] = 'application/json';
  }
  try {
    const backend = process.env.BACKEND_URL;
    if (!backend) return json({ message: errorMessage(503, path) }, 503);
    const upstream = await fetch(`${backend.replace(/\/$/, '')}/api/v1/customer/${path}`, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok) {
      const status = [400, 401, 403, 404, 409, 422, 429].includes(upstream.status)
        ? upstream.status
        : 503;
      const response = json({ message: errorMessage(status, path) }, status);
      if (status === 429) response.headers.set('Retry-After', '60');
      // Un 401 tardif ne doit pas écraser le cookie d’une connexion plus récente.
      return response;
    }
    if (upstream.status === 204) {
      if (
        [
          'config',
          'auth/login',
          'auth/register',
          'auth/forgot',
          'auth/reset',
          'auth/verify',
          'auth/resend-verification',
          'auth/me',
          'wishlist',
          'wishlist/merge',
          'history/settings',
        ].includes(path) ||
        (['history', 'requests'].includes(path) && request.method === 'GET') ||
        (path === 'profile' && request.method === 'PATCH')
      )
        throw new Error();
      const response = new NextResponse(null, { status: 204, headers: responseHeaders });
      return path === 'auth/logout' ||
        path === 'auth/password' ||
        (path === 'profile' && request.method === 'DELETE')
        ? clearSession(response)
        : response;
    }
    const data: unknown = await upstream.json();
    if (path === 'auth/login' || path === 'auth/register') {
      const auth = z
        .object({
          token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
          expiresAt: z.iso.datetime({ offset: true }),
          user: customerUserSchema,
          ...(path === 'auth/register' ? { verificationQueued: z.boolean() } : {}),
        })
        .parse(data);
      const expires = new Date(auth.expiresAt);
      if (expires.getTime() <= Date.now() || expires.getTime() > Date.now() + 32 * 86400000)
        throw new Error();
      const response = json(
        {
          user: auth.user,
          ...('verificationQueued' in auth ? { verificationQueued: auth.verificationQueued } : {}),
        },
        path === 'auth/register' ? 201 : 200,
      );
      response.cookies.set(COOKIE, auth.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/customer',
        expires,
        priority: 'high',
      });
      return response;
    }
    if (path === 'config') return json(customerConfigSchema.parse(data));
    if (path === 'auth/forgot') return json(z.object({ message: z.string().max(400) }).parse(data));
    if (path === 'auth/reset')
      return clearSession(json(z.object({ ok: z.literal(true) }).parse(data)));
    if (path === 'auth/verify') return json(z.object({ ok: z.literal(true) }).parse(data));
    if (path === 'auth/resend-verification')
      return json(z.object({ queued: z.boolean(), verified: z.boolean() }).parse(data));
    if (
      path === 'auth/logout' ||
      path === 'auth/password' ||
      (path === 'profile' && request.method === 'DELETE')
    )
      return clearSession(new NextResponse(null, { status: 204, headers: responseHeaders }));
    if (path === 'auth/me' || path === 'profile')
      return json(z.object({ user: customerUserSchema }).parse(data));
    if (path === 'wishlist' || path === 'wishlist/merge')
      return json(customerWishlistSchema.parse(data));
    if (path === 'history/settings') return json(z.object({ enabled: z.boolean() }).parse(data));
    if (path === 'history') return json(customerHistorySchema.parse(data));
    if (path === 'requests') return json(customerRequestsSchema.parse(data));
    throw new Error();
  } catch {
    return json({ message: errorMessage(503, path) }, 503);
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
