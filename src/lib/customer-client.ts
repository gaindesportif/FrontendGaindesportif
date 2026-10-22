import { z } from 'zod';
import { publicProductSchema } from '@/lib/catalogue';

export const customerConfigSchema = z.object({ emailEnabled: z.boolean() });
export const customerUserSchema = z.object({
  id: z.uuid(),
  email: z.email().max(254),
  displayName: z.string().min(1).max(100),
  createdAt: z.iso.datetime({ offset: true }),
  emailVerifiedAt: z.iso.datetime({ offset: true }).nullable().default(null),
});
export const customerWishlistSchema = z.object({ items: z.array(publicProductSchema).max(100) });
export const customerHistorySchema = z.object({
  items: z
    .array(z.object({ product: publicProductSchema, viewedAt: z.iso.datetime({ offset: true }) }))
    .max(100),
  enabled: z.boolean(),
});
export const customerRequestsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.uuid(),
        product: publicProductSchema.nullable(),
        productName: z.string().max(160),
        productSlug: z.string().max(220),
        priceXof: z.number().int().positive(),
        quantity: z.number().int().min(1).max(99),
        size: z.string().max(60).nullable(),
        color: z.string().max(60).nullable(),
        createdAt: z.iso.datetime({ offset: true }),
        processingStatus: z
          .enum(['prepared', 'received', 'shipped', 'delivered', 'cancelled'])
          .default('prepared'),
        statusUpdatedAt: z.iso.datetime({ offset: true }).nullable().default(null),
      }),
    )
    .max(100),
});
export type CustomerUser = z.infer<typeof customerUserSchema>;
export type WishlistResponse = z.infer<typeof customerWishlistSchema>;
export type HistoryResponse = z.infer<typeof customerHistorySchema>;
export type RequestsResponse = z.infer<typeof customerRequestsSchema>;

export class CustomerApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Les réponses d’une ancienne session ne doivent pas déconnecter le compte suivant.
let sessionRevision = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('gainde-customer-private-cleared', () => {
    sessionRevision += 1;
  });
}

export async function customerFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const startedRevision = sessionRevision;
  let response: Response;
  try {
    response = await fetch(`/api/customer/${path}`, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new CustomerApiError(
      'Connexion interrompue. Réessayez lorsque le réseau est disponible.',
      0,
    );
  }
  if (response.status === 204 && response.ok) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      startedRevision === sessionRevision &&
      response.status === 401 &&
      ![
        'config',
        'auth/login',
        'auth/register',
        'auth/forgot',
        'auth/reset',
        'auth/verify',
        'auth/me',
      ].includes(path) &&
      typeof window !== 'undefined'
    )
      window.dispatchEvent(new Event('gainde-customer-expired'));
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'Cette action n’a pas pu être confirmée. Réessayez.';
    throw new CustomerApiError(message, response.status);
  }
  return data as T;
}

export function customerError(error: unknown): string {
  return error instanceof CustomerApiError
    ? error.message
    : 'Cette action n’a pas pu être confirmée. Réessayez.';
}

export function notifyCustomerChange() {
  window.dispatchEvent(new Event('gainde-customer-changed'));
}

/** Un retour interne permet de reprendre une fiche, jamais une redirection externe. */
export function safeCustomerReturn(value: string | null): string {
  if (
    !value ||
    value.length > 500 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return '/compte';
  const url = new URL(value, 'https://gainde.invalid');
  return url.origin === 'https://gainde.invalid' &&
    /^\/(boutique(?:\/|$)|compte(?:\/|$))/.test(url.pathname) &&
    ![
      '/compte/connexion',
      '/compte/inscription',
      '/compte/recuperation',
      '/compte/reinitialiser',
      '/compte/confirmer-email',
    ].includes(url.pathname)
    ? `${url.pathname}${url.search}${url.hash}`
    : '/compte';
}

export const requestStatusLabels = {
  prepared: 'Demande préparée',
  received: 'Demande reçue',
  shipped: 'Produit expédié',
  delivered: 'Produit livré',
  cancelled: 'Demande annulée',
} as const;
