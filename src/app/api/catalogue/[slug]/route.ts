import { NextResponse } from 'next/server';
import { CatalogueNotFound, fetchCatalogueProduct } from '@/lib/catalogue.server';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const product = await fetchCatalogueProduct(slug, request.headers);
    return NextResponse.json(product, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const notFound = error instanceof CatalogueNotFound;
    return NextResponse.json(
      {
        message: notFound
          ? 'Ce produit n’est plus proposé dans la boutique.'
          : 'Ce produit est momentanément inaccessible. Réessayez dans un instant.',
      },
      { status: notFound ? 404 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
