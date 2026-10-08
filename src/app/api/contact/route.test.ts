import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
const valid = {
  name: 'Test',
  email: 'test@example.com',
  phone: '+221770000000',
  subject: 'autre',
  message: 'Une demande de test.',
  consent: true,
  website: '',
};
function request(body: unknown = valid, origin = 'http://localhost:3000') {
  return new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('proxy de contact', () => {
  it('accepte le host public derrière un serveur standalone interne', async () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:4000');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ reference: '11111111-1111-4111-8111-111111111111' }), {
          status: 201,
        }),
      ),
    );
    const incoming = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:3000',
        Host: '127.0.0.1:3000',
      },
      body: JSON.stringify(valid),
    });
    expect((await POST(incoming)).status).toBe(201);
  });
  it('rejette une origine externe et des données invalides avant de contacter Nest', async () => {
    expect((await POST(request(valid, 'https://external.example'))).status).toBe(403);
    expect((await POST(request({ ...valid, consent: false }))).status).toBe(400);
  });
  it('confirme uniquement une référence valide du backend', async () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:4000');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ reference: '11111111-1111-4111-8111-111111111111' }), {
          status: 201,
        }),
      ),
    );
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect((await response.json()).reference).toBeDefined();
  });
  it('retourne un échec sans exposer de secret', async () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:4000');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sensitive connection string')));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('sensitive');
  });
  it('relaie la limitation de débit', async () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:4000');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    expect((await POST(request())).status).toBe(429);
  });
});
