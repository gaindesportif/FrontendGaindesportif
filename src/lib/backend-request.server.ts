import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

/** Activer seulement avec un header IP unique réellement réécrit par le proxy de confiance. */
export function backendClientHeaders(incoming?: Headers): Record<string, string> {
  const secret = process.env.CONTACT_PROXY_SECRET;
  const header = process.env.CONTACT_IP_HEADER;
  const ip = header && incoming ? incoming.get(header)?.trim() || '' : '';
  // Une chaîne X-Forwarded-For ou une valeur fournie sans configuration n'est pas fiable.
  if (!secret || secret.length < 32 || !header || !isIP(ip)) return {};
  const timestamp = String(Date.now());
  return {
    'x-gainde-client-ip': ip,
    'x-gainde-timestamp': timestamp,
    'x-gainde-signature': createHmac('sha256', secret).update(`${ip}:${timestamp}`).digest('hex'),
  };
}
