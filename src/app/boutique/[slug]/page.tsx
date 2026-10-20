import type { Metadata } from 'next';
import { CatalogueProduct } from '@/components/catalogue/catalogue-product';

export const metadata: Metadata = {
  title: 'Détails du produit',
  description: 'Photos, vidéo, détails et demande sur WhatsApp pour votre produit Gainde Sportif.',
};

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CatalogueProduct key={slug} slug={slug} />;
}
