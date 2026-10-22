'use client';
import { useCategories } from '@/components/catalogue/categories-provider';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { catalogueResponseSchema } from '@/lib/catalogue';
import { Dialog } from './dialog';
import { CatalogueCard } from './catalogue/catalogue-card';
import { useCatalogueResource } from './catalogue/use-catalogue-resource';
import styles from './search-drawer.module.css';

export function SearchDrawer({
  open,
  onClose,
  initialQuery,
}: {
  open: boolean;
  onClose: () => void;
  initialQuery: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog
      id="product-search-dialog"
      open={open}
      onClose={onClose}
      title="Rechercher un produit"
      className={styles.panel}
      initialFocusRef={inputRef}
    >
      <SearchContent initialQuery={initialQuery} onClose={onClose} inputRef={inputRef} />
    </Dialog>
  );
}

function SearchContent({
  initialQuery,
  onClose,
  inputRef,
}: {
  initialQuery: string;
  onClose: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const { categories } = useCategories();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [term, setTerm] = useState(initialQuery.trim());
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const params = new URLSearchParams({ page: '1' });
  if (term) params.set('q', term);
  const { resource, retry } = useCatalogueResource(
    `/api/catalogue?${params}`,
    catalogueResponseSchema.parse,
  );
  const waiting = query.trim() !== term || resource.state === 'loading';
  const searching = Boolean(term);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = new URLSearchParams();
    if (query.trim()) search.set('q', query.trim());
    router.push(`/boutique${search.size ? `?${search}` : ''}`);
    onClose();
  }
  return (
    <div className={styles.content}>
      <form aria-label="Recherche dans la boutique" onSubmit={submit} className={styles.form}>
        <div className={styles.field}>
          <Search size={21} strokeWidth={1.5} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            aria-label="Rechercher un produit"
            placeholder="Rechercher un produit…"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="icon-button"
              aria-label="Effacer la recherche"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
        <button type="submit" className={styles.allResults}>
          Voir tous les résultats <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
      {!query.trim() && (
        <section className={styles.suggestions} aria-labelledby="search-suggestions-title">
          <h2 id="search-suggestions-title">À découvrir</h2>
          <div>
            {categories.map((category) => (
              <Link
                key={category.value}
                href={`/boutique?category=${category.value}`}
                onClick={onClose}
              >
                {category.label}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className={styles.results} aria-labelledby="search-products-title">
        <div className={styles.resultsHeading}>
          <h2 id="search-products-title">Produits</h2>
          <p role="status" aria-live="polite">
            {waiting
              ? 'Recherche en cours…'
              : resource.state === 'ready'
                ? `${resource.data.total} résultat${resource.data.total > 1 ? 's' : ''}`
                : 'Recherche indisponible'}
          </p>
        </div>
        {waiting && <p className={styles.message}>Nous préparons les résultats.</p>}
        {!waiting && (resource.state === 'error' || resource.state === 'missing') && (
          <div className={styles.message}>
            <p>La recherche est momentanément indisponible.</p>
            <button className="text-link" type="button" onClick={retry}>
              Réessayer
            </button>
          </div>
        )}
        {!waiting && resource.state === 'ready' && resource.data.items.length === 0 && (
          <div className={styles.message}>
            <p>
              {searching
                ? `Aucun résultat pour « ${term} ».`
                : 'Les premières pièces arrivent ici.'}
            </p>
            <p>
              {searching
                ? 'Essayez un autre mot ou découvrez nos catégories.'
                : 'Revenez découvrir les produits publiés par notre équipe.'}
            </p>
          </div>
        )}
        {!waiting && resource.state === 'ready' && resource.data.items.length > 0 && (
          <div className={styles.grid}>
            {resource.data.items.slice(0, 6).map((product) => (
              <CatalogueCard
                key={product.id}
                product={product}
                headingLevel={3}
                sizes="(max-width: 700px) 43vw, 200px"
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
