import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { backendClientHeaders } from './backend-request.server';

afterEach(() => {
  vi.unstubAllEnvs();
});
describe('identité du visiteur vers Nest', () => {
  it('ignore les headers arbitraires sans configuration explicite', () => {
    vi.stubEnv('CONTACT_PROXY_SECRET', '');
    vi.stubEnv('CONTACT_IP_HEADER', '');
    expect(
      backendClientHeaders(
        new Headers({ 'x-forwarded-for': '192.0.2.1', 'x-gainde-client-ip': '192.0.2.2' }),
      ),
    ).toEqual({});
  });
  it('signe seulement une IP unique du header configuré et ne relaie aucune signature entrante', () => {
    const secret = 'local-proxy-test-secret-32-characters';
    vi.stubEnv('CONTACT_PROXY_SECRET', secret);
    vi.stubEnv('CONTACT_IP_HEADER', 'x-trusted-client-ip');
    const result = backendClientHeaders(
      new Headers({ 'x-trusted-client-ip': '192.0.2.1', 'x-gainde-signature': 'forged' }),
    );
    expect(result['x-gainde-client-ip']).toBe('192.0.2.1');
    expect(result['x-gainde-signature']).toBe(
      createHmac('sha256', secret)
        .update(`192.0.2.1:${result['x-gainde-timestamp']}`)
        .digest('hex'),
    );
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(
      backendClientHeaders(new Headers({ 'x-trusted-client-ip': '192.0.2.1, 192.0.2.2' })),
    ).toEqual({});
  });
});
