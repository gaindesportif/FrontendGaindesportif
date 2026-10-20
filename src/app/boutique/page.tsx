import type { Metadata } from 'next';
import { catalogueCategories } from '@/lib/catalogue';
import { CatalogueExplorer } from '@/components/catalogue/catalogue-explorer';

export const metadata: Metadata = {
  title: 'La boutique',
  description:
    'Découvrez les produits Gainde Sportif, leurs détails et leurs visuels. Préparez votre demande sur WhatsApp.',
};

export default async function BoutiquePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const category =
    typeof params.category === 'string' &&
    catalogueCategories.some((item) => item.value === params.category)
      ? params.category
      : '';
  return (
    <CatalogueExplorer key={JSON.stringify([query, category])} query={query} category={category} />
  );
}
