import { permanentRedirect } from 'next/navigation';
import { catalogueCategories } from '@/lib/catalogue';

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (
    typeof params.category === 'string' &&
    catalogueCategories.some((category) => category.value === params.category)
  )
    query.set('category', params.category);
  if (typeof params.q === 'string' && params.q.trim())
    query.set('q', params.q.trim().slice(0, 100));
  permanentRedirect(`/boutique${query.size ? `?${query}` : ''}`);
}
