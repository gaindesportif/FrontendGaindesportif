'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowUpRight } from 'lucide-react';
import { adminFetch, adminError } from '@/lib/admin-client';
import { articleCategories, articleDate, type AdminArticle } from '@/lib/editorial';
import styles from './editorial.module.css';
export function AdminArticles() {
  const [data, setData] = useState<{ items: AdminArticle[]; total: number }>({
      items: [],
      total: 0,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [q, setQ] = useState(''),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const qs = new URLSearchParams({
      page: String(page),
      ...(status ? { status } : {}),
      ...(q ? { q } : {}),
    });
    adminFetch<typeof data>(`articles?${qs}`)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(adminError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, q, reload]);
  return (
    <div className={styles.root}>
      <header className={styles.adminHeader}>
        <div>
          <p className={styles.kicker}>La rédaction</p>
          <h1 className={styles.adminTitle}>Gaindé Media</h1>
          <p className={styles.excerpt}>Des histoires à écrire. Des regards à partager.</p>
        </div>
        <Link className={styles.button} href="/administration/media/nouveau">
          <Plus size={18} />
          Nouvel article
        </Link>
      </header>
      <nav className={styles.filters} aria-label="État des articles">
        {[
          ['', 'Tous les articles'],
          ['draft', 'Brouillons'],
          ['published', 'Publiés'],
        ].map(([v, label]) => (
          <button
            key={v}
            className={styles.filter}
            aria-pressed={status === v}
            onClick={() => {
              setLoading(true);
              setError('');
              setReload((x) => x + 1);
              setStatus(v);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <form
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          setReload((x) => x + 1);
          setQ(query.trim());
          setPage(1);
        }}
      >
        <label className={styles.label}>
          Rechercher dans les articles
          <input
            className={styles.input}
            value={query}
            maxLength={120}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className={styles.secondary}>Rechercher</button>
      </form>
      {error ? (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          <p>{error}</p>
          <button
            className={styles.secondary}
            onClick={() => (setLoading(true), setError(''), setReload((v) => v + 1))}
          >
            Réessayer
          </button>
        </div>
      ) : loading ? (
        <p role="status" className={styles.empty}>
          Chargement des articles…
        </p>
      ) : (
        <>
          {!data.items.length ? (
            <section className={styles.empty}>
              <h2>Aucun article pour le moment</h2>
              <p>Commencez par un brouillon. Il restera privé tant que vous ne le publierez pas.</p>
            </section>
          ) : (
            <div className={styles.table}>
              {data.items.map((a) => (
                <article key={a.id} className={styles.row}>
                  <div>
                    <div className={styles.meta}>
                      <span
                        className={`${styles.status} ${a.status === 'published' ? styles.published : ''}`}
                      >
                        {a.status === 'draft' ? 'Brouillon' : 'Publié'}
                      </span>
                      {a.featured && (
                        <span className={styles.featureBadge}>
                          {a.status === 'published' ? 'À la une' : 'Une prévue'}
                        </span>
                      )}
                      <span>{articleCategories[a.category]}</span>
                    </div>
                    <Link className={styles.rowTitle} href={`/administration/media/${a.id}`}>
                      {a.title}
                    </Link>
                    <p className={styles.hint}>Modifié le {articleDate(a.updatedAt)}</p>
                  </div>
                  <Link className={styles.secondary} href={`/administration/media/${a.id}`}>
                    Ouvrir <ArrowUpRight size={15} />
                  </Link>
                </article>
              ))}
            </div>
          )}
          {data.total > 12 && (
            <nav className={styles.pagination} aria-label="Pages des articles">
              <button
                className={styles.secondary}
                disabled={page === 1}
                onClick={() => (setLoading(true), setError(''), setPage((v) => v - 1))}
              >
                Précédent
              </button>
              <span>
                Page {page} sur {Math.ceil(data.total / 12)}
              </span>
              <button
                className={styles.secondary}
                disabled={page * 12 >= data.total}
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
