import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { mediaPublicEnabled } from '@/lib/editorial.server';
import { MediaFeed } from '@/components/editorial/media-feed';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Gaindé Media — La voix du sport',
  description:
    'Actualités, interviews, reportages et analyses : les récits du sport avec Gaindé Media.',
  alternates: { canonical: '/media' },
};
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!mediaPublicEnabled()) notFound();
  const p = await searchParams;
  const category =
    typeof p.category === 'string' &&
    ['actualites', 'interviews', 'reportages', 'analyses'].includes(p.category)
      ? p.category
      : '';
  const page =
    typeof p.page === 'string' &&
    /^\d+$/.test(p.page) &&
    Number(p.page) >= 1 &&
    Number(p.page) <= 100000
      ? Number(p.page)
      : 1;
  const q = typeof p.q === 'string' ? p.q.trim().slice(0, 120) : '';
  return <MediaFeed initialQuery={{ q, category, page }} />;
}
