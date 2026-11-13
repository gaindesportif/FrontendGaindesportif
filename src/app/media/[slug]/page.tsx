import type { Metadata } from 'next';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArticleNotFound, getArticle, mediaPublicEnabled } from '@/lib/editorial.server';
import { articleCategories, articleDate, readingMinutes } from '@/lib/editorial';
import { ArticleBody } from '@/components/editorial/article-body';
import { ArticleShare } from '@/components/editorial/article-share';
import styles from '@/components/editorial/editorial.module.css';
export const dynamic = 'force-dynamic';
const read = cache(async (slug: string) => getArticle(slug, await headers()));
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!mediaPublicEnabled()) return { robots: { index: false, follow: false } };
  try {
    const a = await read((await params).slug);
    return {
      title: a.title,
      description: a.excerpt || a.body.slice(0, 155),
      alternates: { canonical: `/media/${a.slug}` },
      openGraph: {
        title: a.title,
        description: a.excerpt || a.body.slice(0, 155),
        type: 'article',
        publishedTime: a.publishedAt || undefined,
        modifiedTime: a.updatedAt,
        ...(a.author ? { authors: [a.author] } : {}),
        images: a.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt || a.title })),
      },
    };
  } catch {
    return { title: 'Article', robots: { index: false, follow: false } };
  }
}
export default async function ArticlePage({ params }: Props) {
  if (!mediaPublicEnabled()) notFound();
  let a;
  try {
    a = await read((await params).slug);
  } catch (e) {
    if (e instanceof ArticleNotFound) notFound();
    return (
      <section className={styles.root}>
        <h1 className={styles.adminTitle}>La lecture est momentanément indisponible</h1>
        <p className={styles.notice}>
          Votre connexion ou le service ne répond pas. Réessayez dans un instant.
        </p>
        <Link className={styles.secondary} href={`/media/${(await params).slug}`}>
          Réessayer
        </Link>
        <Link className={styles.secondary} href="/media">
          Toutes les publications
        </Link>
      </section>
    );
  }
  return (
    <article className={styles.root}>
      <Link className={styles.back} href="/media">
        ← Toutes les publications
      </Link>
      <header className={styles.articleHeader}>
        {a.featured && <p className={styles.featureBadge}>À la une</p>}
        <p className={styles.kicker}>{articleCategories[a.category]}</p>
        <h1 className={styles.articleTitle}>{a.title}</h1>
        {a.excerpt && <p className={styles.lead}>{a.excerpt}</p>}
        <div className={styles.meta}>
          {a.author && <span>Par {a.author}</span>}
          <time dateTime={a.publishedAt || undefined}>{articleDate(a.publishedAt)}</time>
          <span>{readingMinutes(a.body)} min de lecture</span>
        </div>
      </header>
      {a.images[0] && (
        <figure className={styles.figure}>
          <Image
            src={a.images[0].url}
            alt={a.images[0].alt || a.title}
            width={1600}
            height={900}
            priority
            unoptimized
            className={styles.articlePhoto}
          />
          {(a.images[0].caption || a.images[0].credit) && (
            <figcaption className={styles.caption}>
              {a.images[0].caption && <span>{a.images[0].caption}</span>}
              {a.images[0].credit && <span>Photo : {a.images[0].credit}</span>}
            </figcaption>
          )}
        </figure>
      )}
      <div className={styles.reading}>
        <aside className={styles.aside}>
          <p className={styles.category}>
            Faire circuler
            <br />
            les histoires.
          </p>
          <ArticleShare title={a.title} />
        </aside>
        <div>
          <ArticleBody body={a.body} />
          {a.images.slice(1).map((i) => (
            <figure key={i.id} className={styles.figure}>
              <Image
                src={i.url}
                alt={i.alt || a.title}
                width={1000}
                height={700}
                unoptimized
                className={styles.articlePhoto}
              />
              {(i.caption || i.credit) && (
                <figcaption className={styles.caption}>
                  {i.caption && <span>{i.caption}</span>}
                  {i.credit && <span>Photo : {i.credit}</span>}
                </figcaption>
              )}
            </figure>
          ))}
          <Link className={styles.secondary} href="/media">
            Continuer la lecture →
          </Link>
        </div>
      </div>
    </article>
  );
}
