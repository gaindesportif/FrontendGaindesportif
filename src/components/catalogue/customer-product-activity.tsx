'use client';

import { useEffect } from 'react';
import { useCustomer } from '@/components/account/customer-provider';
import { customerFetch } from '@/lib/customer-client';

/** Consultation mémorisée uniquement après chargement d’une vraie publication et connexion. */
export function CustomerProductActivity({ productId }: { productId: string }) {
  const { user, status } = useCustomer();
  const accountId = status === 'authenticated' ? user?.id : undefined;
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    void customerFetch('history', {
      method: 'POST',
      body: JSON.stringify({ productId }),
      signal: controller.signal,
    }).catch(() => {
      // Une panne de mémorisation ne bloque jamais la consultation du catalogue.
    });
    return () => controller.abort();
  }, [accountId, productId]);
  return null;
}
