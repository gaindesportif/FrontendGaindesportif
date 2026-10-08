import { NextRequest, NextResponse } from 'next/server';
import { contactSchema } from '@/lib/contact';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Même origine uniquement pour les navigateurs, URL publique explicitement configurée derrière proxy.
  if (origin) {
    try {
      const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL;
      const browserOrigin = new URL(origin);
      const host = request.headers.get('host') || request.nextUrl.host;
      const allowed = publicOrigin
        ? origin === publicOrigin
        : browserOrigin.host === host &&
          ['http:', 'https:'].includes(browserOrigin.protocol) &&
          browserOrigin.origin === origin;
      if (!allowed)
        return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403 });
    } catch {
      return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403 });
    }
  }
  if (!request.headers.get('content-type')?.includes('application/json'))
    return NextResponse.json({ message: 'Format non autorisé.' }, { status: 415 });
  if (Number(request.headers.get('content-length') || 0) > 16384)
    return NextResponse.json({ message: 'Message trop volumineux.' }, { status: 413 });
  let data: unknown;
  try {
    const body = await request.text();
    if (body.length > 16384)
      return NextResponse.json({ message: 'Message trop volumineux.' }, { status: 413 });
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ message: 'Message illisible.' }, { status: 400 });
  }
  const result = contactSchema.safeParse(data);
  if (!result.success)
    return NextResponse.json({ message: 'Vérifiez les champs du formulaire.' }, { status: 400 });
  try {
    const backend = process.env.BACKEND_URL;
    if (!backend) throw new Error('Backend non configuré');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const requestKey = request.headers.get('idempotency-key');
    if (requestKey) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)
      )
        return NextResponse.json({ message: 'Référence de demande invalide.' }, { status: 400 });
      headers['Idempotency-Key'] = requestKey;
    }
    const secret = process.env.CONTACT_PROXY_SECRET;
    const ipHeader = process.env.CONTACT_IP_HEADER;
    // Activer uniquement une fois le header réécrit par Vercel/Traefik validé.
    const ip = ipHeader ? request.headers.get(ipHeader)?.split(',')[0].trim() || '' : '';
    if (secret && secret.length >= 32 && isIP(ip)) {
      const timestamp = String(Date.now());
      headers['x-gainde-client-ip'] = ip;
      headers['x-gainde-timestamp'] = timestamp;
      headers['x-gainde-signature'] = createHmac('sha256', secret)
        .update(`${ip}:${timestamp}`)
        .digest('hex');
    }
    const response = await fetch(`${backend.replace(/\/$/, '')}/api/v1/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(result.data),
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    if (response.status === 429)
      return NextResponse.json(
        { message: 'Trop de demandes en peu de temps. Patientez une minute ou utilisez WhatsApp.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    if (!response.ok) throw new Error('Enregistrement indisponible');
    const saved = await response.json();
    if (typeof saved.reference !== 'string' || !/^[\da-f-]{36}$/.test(saved.reference))
      throw new Error('Réponse invalide');
    return NextResponse.json(
      { reference: saved.reference },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          'L’enregistrement de votre message n’a pas pu être confirmé. Réessayez ou contactez-nous par WhatsApp.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
