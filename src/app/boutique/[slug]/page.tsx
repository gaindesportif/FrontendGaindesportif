import type { Metadata } from 'next';
import { CatalogueProduct } from '@/components/catalogue/catalogue-product';
import { fetchCatalogueProduct } from '@/lib/catalogue.server';

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await fetchCatalogueProduct(slug);
    const image = product.media[0];
    const description =
      product.description.slice(0, 180) ||
      `Découvrez ${product.name}, ses photos et son stock disponible.`;
    const url = `/boutique/${product.slug}`;
    return {
      title: product.name,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: product.name,
        description,
        url,
        type: 'website',
        images: [{ url: image.url, alt: image.alt || product.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description,
        images: [image.url],
      },
    };
  } catch {
    return {
      title: 'Détails du produit',
      description: 'Photos, détails et demande sur WhatsApp pour votre produit Gaindé Sportif.',
    };
  }
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  return <CatalogueProduct key={slug} slug={slug} />;
}
