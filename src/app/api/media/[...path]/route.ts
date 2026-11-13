import { NextRequest, NextResponse } from 'next/server';
import {
  ArticleNotFound,
  getArticle,
  getArticles,
  mediaPublicEnabled,
} from '@/lib/editorial.server';
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!mediaPublicEnabled())
    return NextResponse.json({ message: 'Introuvable.' }, { status: 404, headers });
  const { path } = await params;
  if (path[0] !== 'articles' || path.length > 2)
    return NextResponse.json({ message: 'Introuvable.' }, { status: 404, headers });
  try {
    const query = new URLSearchParams();
    for (const k of ['page', 'q', 'category']) {
      const v = request.nextUrl.searchParams.get(k);
      if (v) query.set(k, v);
    }
    return NextResponse.json(
      path.length === 2
        ? await getArticle(path[1], request.headers)
        : await getArticles(query, request.headers),
      { headers },
    );
  } catch (e) {
    return NextResponse.json(
      { message: 'Les publications sont momentanément indisponibles.' },
      { status: e instanceof ArticleNotFound ? 404 : 503, headers },
    );
  }
}
