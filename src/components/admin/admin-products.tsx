'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Dialog } from '@/components/dialog';
import { adminError, adminFetch, formatAdminPrice, type AdminProduct } from '@/lib/admin-client';
import styles from './admin.module.css';

type ProductPage = { items: AdminProduct[]; total: number; page: number; pageSize: number };
export const adminStatusLabels = {
  draft: 'Brouillon',
  published: 'Publié',
  deleting: 'Suppression en attente',
};
export const categoryLabels: Record<string, string> = {
  senegal: 'Sénégal',
  dakar: 'Dakar',
  accessoires: 'Accessoires',
  equipements: 'Équipements',
  personnalisation: 'Personnalisation',
  merchandising: 'Produits dérivés',
};

export function AdminProducts() {
  const [result, setResult] = useState<ProductPage | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [remove, setRemove] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(
        await adminFetch<ProductPage>(
          `products?page=${page}&pageSize=24&q=${encodeURIComponent(query)}`,
        ),
      );
    } catch (error) {
      setError(adminError(error));
    } finally {
      setLoading(false);
    }
  }, [page, query]);
  useEffect(() => {
    let current = true;
    adminFetch<ProductPage>(`products?page=${page}&pageSize=24&q=${encodeURIComponent(query)}`)
      .then((result) => {
        if (current) {
          setResult(result);
          setError('');
        }
      })
      .catch((error: unknown) => {
        if (current) setError(adminError(error));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [page, query]);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = String(new FormData(event.currentTarget).get('q') || '').trim();
    if (nextQuery === query && page === 1) {
      void load();
      return;
    }
    setLoading(true);
    setQuery(nextQuery);
    setPage(1);
  }
  async function deleteProduct() {
    if (!remove) return;
    setDeleting(true);
    setError('');
    try {
      const outcome = await adminFetch<{ deleted: boolean; pendingMediaCleanup: number }>(
        `products/${remove.id}`,
        { method: 'DELETE' },
      );
      setNotice(
        outcome.deleted
          ? 'Le produit et ses médias ont été supprimés.'
          : 'Le produit est retiré de la boutique. La suppression des médias reste en attente ; vous pouvez relancer le nettoyage.',
      );
      setRemove(null);
      await load();
    } catch (error) {
      setError(adminError(error));
      setRemove(null);
    } finally {
      setDeleting(false);
    }
  }
  return (
    <>
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Catalogue</p>
          <h1 className={styles.title}>Vos produits</h1>
          <p className={styles.subtitle}>
            Renseignez les articles, préparez vos médias, puis publiez quand tout est prêt.
          </p>
        </div>
        <Link href="/administration/produits/nouveau" className={styles.button}>
          Ajouter un produit
        </Link>
      </div>
      <form className={styles.bar} onSubmit={search} role="search" style={{ marginTop: 24 }}>
        <label htmlFor="admin-search" className="sr-only">
          Rechercher un produit
        </label>
        <input
          id="admin-search"
          className={styles.search}
          name="q"
          placeholder="Rechercher un produit"
          type="search"
          maxLength={120}
        />
        <button className={styles.secondary} type="submit" disabled={loading}>
          Rechercher
        </button>
      </form>
      {error && (
        <div role="alert" className={styles.error}>
          {error}{' '}
          <button className={styles.secondary} onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className={styles.panel}>
          Chargement des produits…
        </p>
      ) : result?.items.length === 0 ? (
        <section className={`${styles.panel} ${styles.empty}`}>
          <h2>{query ? 'Aucun produit trouvé' : 'Votre catalogue commence ici'}</h2>
          <p>
            {query
              ? 'Essayez un autre nom de produit.'
              : 'Créez votre premier brouillon avec les informations réelles de votre boutique.'}
          </p>
        </section>
      ) : result ? (
        <>
          <div className={styles.list}>
            {result.items.map((product) => {
              const photo = product.media.find((media) => media.type === 'image');
              return (
                <article key={product.id} className={styles.row}>
                  {photo ? (
                    <Image
                      unoptimized
                      src={photo.url}
                      alt=""
                      width={64}
                      height={76}
                      className={styles.thumb}
                    />
                  ) : (
                    <span className={styles.thumb}>Sans photo</span>
                  )}
                  <div>
                    <h2 className={styles.productName}>{product.name}</h2>
                    <div className={styles.meta}>
                      <span>{formatAdminPrice(product.priceXof)}</span>
                      <span>{categoryLabels[product.category] || product.category}</span>
                      <span
                        className={`${styles.badge} ${product.status === 'published' ? styles.published : product.status === 'deleting' ? styles.pending : ''}`}
                      >
                        {adminStatusLabels[product.status]}
                      </span>
                    </div>
                    {!!product.pendingMediaCleanup && (
                      <p className={styles.hint}>
                        Médias en attente de nettoyage : {product.pendingMediaCleanup}.
                      </p>
                    )}
                  </div>
                  <div className={styles.actions}>
                    {product.status !== 'deleting' && (
                      <Link
                        className={styles.secondary}
                        href={`/administration/produits/${product.id}`}
                      >
                        Modifier
                      </Link>
                    )}
                    <button className={styles.danger} onClick={() => setRemove(product)}>
                      {product.status === 'deleting' ? 'Relancer le nettoyage' : 'Supprimer'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className={styles.headingRow} style={{ marginTop: 24 }}>
            <p>
              {result.total} produit{result.total > 1 ? 's' : ''} · Page {page}
            </p>
            <div className={styles.actions}>
              <button
                className={styles.secondary}
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => value - 1);
                }}
              >
                Précédente
              </button>
              <button
                className={styles.secondary}
                disabled={page * result.pageSize >= result.total}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => value + 1);
                }}
              >
                Suivante
              </button>
            </div>
          </div>
        </>
      ) : null}
      <Dialog
        open={!!remove}
        onClose={() => {
          if (!deleting) setRemove(null);
        }}
        title="Supprimer le produit"
      >
        <h2 className={styles.title}>{remove?.name}</h2>
        <p>
          Le produit sera retiré de la boutique et ses photos et vidéos seront supprimées de
          Cloudinary. Si le nettoyage est interrompu, son état restera visible ici.
        </p>
        <div className={styles.actions} style={{ marginTop: 24 }}>
          <button className={styles.danger} onClick={deleteProduct} disabled={deleting}>
            {deleting ? 'Suppression…' : 'Confirmer la suppression'}
          </button>
          <button className={styles.secondary} onClick={() => setRemove(null)} disabled={deleting}>
            Annuler
          </button>
        </div>
      </Dialog>
    </>
  );
}
