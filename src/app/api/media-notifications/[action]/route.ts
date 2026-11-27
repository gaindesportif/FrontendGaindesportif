import { NextRequest, NextResponse } from 'next/server';
import { backendClientHeaders } from '@/lib/backend-request.server';
import { mediaPublicEnabled } from '@/lib/editorial.server';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
type RouteContext = { params: Promise<{ action: string }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;
  const matches =
    request.method === 'GET' ? action === 'config' : ['subscribe', 'unsubscribe'].includes(action);
  if (!mediaPublicEnabled() || !matches)
    return NextResponse.json({ message: 'Introuvable.' }, { status: 404, headers });
  try {
    let body: string | undefined;
    if (request.method === 'POST') {
      const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
      if (request.headers.get('origin') !== origin)
        return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403, headers });
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
        return NextResponse.json({ message: 'Format incorrect.' }, { status: 415, headers });
      body = await request.text();
      if (new TextEncoder().encode(body).length > 4096)
        return NextResponse.json(
          { message: 'Données trop volumineuses.' },
          { status: 413, headers },
        );
    }
    const backend = new URL(process.env.BACKEND_URL ?? '');
    if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password)
      throw new Error();
    const response = await fetch(
      `${backend.href.replace(/\/$/, '')}/api/v1/media-notifications/${action}`,
      {
        method: request.method,
        body,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(6000),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...backendClientHeaders(request.headers),
        },
      },
    );
    if (response.ok) {
      if (action !== 'config') return new NextResponse(null, { status: 204, headers });
      const config = (await response.json()) as { publicKey?: unknown };
      const publicKey =
        typeof config.publicKey === 'string' && /^[\w-]{87}$/.test(config.publicKey)
          ? config.publicKey
          : null;
      return NextResponse.json({ publicKey }, { headers });
    }
    return NextResponse.json(
      { message: 'Notifications indisponibles.' },
      {
        status: response.status >= 500 ? 503 : response.status,
        headers,
      },
    );
  } catch {
    return NextResponse.json({ message: 'Notifications indisponibles.' }, { status: 503, headers });
  }
}

export const GET = proxy;
export const POST = proxy;
