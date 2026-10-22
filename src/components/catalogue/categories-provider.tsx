'use client';
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { catalogueCategories, categoriesResponseSchema } from '@/lib/catalogue';
type Category = { value: string; label: string };
const Context = createContext<{
  categories: Category[];
  error: boolean;
  reload: () => Promise<void>;
}>({ categories: catalogueCategories, error: false, reload: async () => {} });
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(catalogueCategories);
  const [error, setError] = useState(false);
  const reload = useCallback(async () => {
    try {
      const response = await fetch('/api/categories', {
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error();
      const result = categoriesResponseSchema.parse(await response.json());
      setCategories(result.items);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);
  return <Context.Provider value={{ categories, error, reload }}>{children}</Context.Provider>;
}
export function useCategories() {
  return useContext(Context);
}
