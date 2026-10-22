export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  role: 'owner' | 'admin';
  active: boolean;
  createdAt: string;
};

export type ProductMedia = {
  id: string;
  url: string;
  type: 'image' | 'video';
  alt: string;
  position: number;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceXof: number | null;
  category: string;
  categoryLabel?: string;
  stockQuantity: number | null;
  sizes: string[];
  colors: string[];
  availability: 'available' | 'on_request' | 'unavailable';
  status: 'draft' | 'published' | 'deleting';
  media: ProductMedia[];
  updatedAt: string;
  createdAt: string;
  pendingMediaCleanup?: number;
  publicationReady?: boolean;
};

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/${path}`, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch {
    throw new AdminApiError('Connexion interrompue. Vos modifications ne sont pas confirmées.', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== 'auth/login' &&
      path !== 'auth/me' &&
      typeof window !== 'undefined'
    )
      window.dispatchEvent(new Event('gainde-admin-expired'));
    throw new AdminApiError(
      typeof data?.message === 'string'
        ? data.message
        : 'Vérifiez les informations puis réessayez.',
      response.status,
    );
  }
  return data as T;
}

export function adminError(error: unknown): string {
  if (error instanceof AdminApiError && error.status === 401)
    return 'Votre session a expiré. Reconnectez-vous avant de continuer.';
  return error instanceof AdminApiError ? error.message : 'Cette action n’a pas pu être confirmée.';
}

export function formatAdminPrice(value: number | null): string {
  return value === null
    ? 'Prix à renseigner'
    : `${new Intl.NumberFormat('fr-SN').format(value)} F CFA`;
}
