'use client';

import { useEffect, useState } from 'react';

type Resource<T> =
  | { url: string; state: 'loading' }
  | { url: string; state: 'ready'; data: T }
  | { url: string; state: 'error' | 'missing' };

export function useCatalogueResource<T>(url: string, parse: (value: unknown) => T) {
  const [resource, setResource] = useState<Resource<T>>({ url, state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    async function load() {
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          if (current) setResource({ url, state: response.status === 404 ? 'missing' : 'error' });
          return;
        }
        const data = parse(await response.json());
        if (current) setResource({ url, state: 'ready', data });
      } catch {
        if (current) setResource({ url, state: 'error' });
      }
    }
    void load();
    return () => {
      current = false;
      controller.abort();
    };
  }, [url, parse, attempt]);

  function retry() {
    setResource({ url, state: 'loading' });
    setAttempt((value) => value + 1);
  }

  return { resource: resource.url === url ? resource : { url, state: 'loading' as const }, retry };
}
