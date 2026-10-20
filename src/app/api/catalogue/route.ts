import { NextRequest, NextResponse } from 'next/server';
import { fetchCatalogue } from '@/lib/catalogue.server';

export async function GET(request: NextRequest) {
  try {
    const catalogue = await fetchCatalogue(request.nextUrl.searchParams, request.headers);
    return NextResponse.json(catalogue, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { message: 'La boutique est momentanément indisponible. Réessayez dans un instant.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
