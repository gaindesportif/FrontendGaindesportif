import { NextRequest, NextResponse } from 'next/server';
import { fetchProductCategories } from '@/lib/catalogue.server';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await fetchProductCategories(request.headers), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { message: 'Les catégories sont momentanément indisponibles.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
