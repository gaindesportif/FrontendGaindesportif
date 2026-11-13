'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Search } from 'lucide-react';
import {
  articleCategories,
  articleDate,
  articleListSchema,
  type ArticleCard,
} from '@/lib/editorial';
import styles from './editorial.module.css';
export function MediaFeed({
  initialQuery = { q: '', category: '', page: 1 },
}: {
  initialQuery?: { q: string; category: string; page: number };
}) {
  const [items, setItems] = useState<ArticleCard[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(initialQuery.page),
    [category, setCategory] = useState(initialQuery.category),
    [q, setQ] = useState(initialQuery.q),
    [input, setInput] = useState(initialQuery.q),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const ac = new AbortController();
    const query = new URLSearchParams({
      page: String(page),
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
    });
    window.history.replaceState(null, '', `/media${query.size ? `?${query}` : ''}`);
    fetch(`/api/media/articles?${query}`, { signal: ac.signal, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return articleListSchema.parse(await r.json());
      })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
      })
      .catch(() => {
        if (!ac.signal.aborted)
          setError('Les articles ne peuvent pas être chargés. Réessayez dans un instant.');
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [category, page, q, retry]);
  const choose = useCallback((v: string) => {
    setLoading(true);
    setError('');
    setRetry((x) => x + 1);
    setCategory(v);
    setPage(1);
  }, []);
  return (
    <div className={`${styles.root} ${styles.feed}`}>
      <header className={styles.hero}>
        <div>
          <h1 className={styles.title}>Gaindé Media</h1>
          <p className={styles.intro}>La voix du sport.</p>
        </div>
        <form
          className={`${styles.search} ${styles.feedSearch}`}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            setRetry((x) => x + 1);
            setQ(input.trim());
            setPage(1);
          }}
        >
          <label className={styles.label}>
            Rechercher un article
            <input
              className={styles.input}
              type="search"
              value={input}
              maxLength={120}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Un sujet, un titre…"
            />
          </label>
          <button className={styles.button}>
            <Search size={16} />
            Rechercher
          </button>
          {q && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setLoading(true);
                setError('');
                setInput('');
                setQ('');
                setPage(1);
              }}
            >
              Effacer la recherche
            </button>
          )}
        </form>
      </header>
      <nav className={styles.filters} aria-label="Rubriques des articles">
        <button className={styles.filter} aria-pressed={!category} onClick={() => choose('')}>
          Tous les récits
        </button>
        {Object.entries(articleCategories).map(([key, label]) => (
          <button
            key={key}
            className={styles.filter}
            aria-pressed={key === category}
            onClick={() => choose(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {loading ? (
        <p role="status" className={styles.empty}>
          Chargement des publications…
        </p>
      ) : error ? (
        <div role="alert" className={`${styles.notice} ${styles.error}`}>
          <p>{error}</p>
          <button
            className={styles.secondary}
            onClick={() => (setLoading(true), setError(''), setRetry((v) => v + 1))}
          >
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <p className={styles.hint} role="status">
            {total} publication{total > 1 ? 's' : ''}
          </p>
          {!items.length ? (
            <div className={styles.empty}>
              <h2>
                {q || category ? 'Aucun article trouvé' : 'Les premiers récits arrivent bientôt'}
              </h2>
              <p>
                {q || category
                  ? 'Essayez une autre recherche ou une autre rubrique.'
                  : 'Retrouvez prochainement les publications de Gaindé Media.'}
              </p>
            </div>
          ) : (
            <div className={styles.grid}>
              {items.map((a) => (
                <article key={a.id} className={styles.card}>
                  <Link
                    href={`/media/${a.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                    className={styles.cover}
                  >
                    {a.images[0] && (
                      <Image
                        src={a.images[0].url}
                        alt=""
                        width={960}
                        height={600}
                        unoptimized
                        className={styles.photo}
                      />
                    )}
                  </Link>
                  <div>
                    <div className={styles.meta}>
                      {a.featured && <span className={styles.featureBadge}>À la une</span>}
                      <span className={styles.category}>{articleCategories[a.category]}</span>
                      <time dateTime={a.publishedAt || undefined}>
                        {articleDate(a.publishedAt)}
                      </time>
                    </div>
                    <h2>
                      <Link href={`/media/${a.slug}`}>{a.title}</Link>
                    </h2>
                    {a.excerpt && <p className={styles.excerpt}>{a.excerpt}</p>}
                    {a.author && <p className={styles.hint}>Par {a.author}</p>}
                    <Link
                      href={`/media/${a.slug}`}
                      className={styles.back}
                      aria-label={`Lire : ${a.title}`}
                    >
                      Lire le récit <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          {total > 12 && (
            <nav className={styles.pagination} aria-label="Pages des publications">
              <button
                className={styles.secondary}
                disabled={page === 1}
                onClick={() => (setLoading(true), setError(''), setPage((v) => v - 1))}
              >
                Précédent
              </button>
              <span>
                Page {page} sur {Math.ceil(total / 12)}
              </span>
              <button
                className={styles.secondary}
                disabled={page * 12 >= total}
                onClick={() => (setLoading(true), setError(''), setPage((v) => v + 1))}
              >
                Suivant
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
