'use client';
import { useCategories } from '@/components/catalogue/categories-provider';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { catalogueResponseSchema } from '@/lib/catalogue';
import { useCatalogueResource } from './use-catalogue-resource';
import { CatalogueState } from './catalogue-state';
import { CatalogueCard } from './catalogue-card';
import styles from './catalogue.module.css';

export function CatalogueExplorer({
  query: search,
  category,
}: {
  query: string;
  category: string;
}) {
  const { categories, error: categoryError, reload: reloadCategories } = useCategories();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page) });
  if (search) query.set('q', search);
  if (category) query.set('category', category);
  const { resource, retry } = useCatalogueResource(
    `/api/catalogue?${query}`,
    catalogueResponseSchema.parse,
  );

  function navigate(nextSearch: string, nextCategory: string) {
    const params = new URLSearchParams();
    if (nextSearch) params.set('q', nextSearch);
    if (nextCategory) params.set('category', nextCategory);
    router.push(`/boutique${params.size ? `?${params}` : ''}`);
  }
  function resetFilters() {
    navigate('', '');
  }
  const filtered = Boolean(search || category);
  return (
    <section className={styles.page} aria-labelledby="boutique-title">
      <div className={styles.intro}>
        <div>
          <span className="eyebrow">Gainde Sportif / Boutique</span>
          <h1 className={styles.title} id="boutique-title">
            Équipez-vous
            <br />
            pour le terrain.
          </h1>
        </div>
        <p>
          Les pièces, les détails, votre choix. Découvrez nos produits et échangez avec notre équipe
          sur WhatsApp pour commander.
        </p>
      </div>
      <div className={styles.categoryTabs} role="group" aria-label="Catégories de la boutique">
        {[{ value: '', label: 'Toutes les catégories' }, ...categories].map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={category === item.value}
            onClick={() => navigate(search, item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {categoryError && (
        <p role="status">
          Les catégories n’ont pas pu être actualisées.{' '}
          <button type="button" onClick={() => void reloadCategories()}>
            Actualiser les catégories
          </button>
        </p>
      )}
      <div className={styles.toolbar}>
        <span role="status" aria-live="polite">
          {resource.state === 'loading'
            ? 'Chargement des produits…'
            : resource.state === 'ready'
              ? `${resource.data.total} produit${resource.data.total > 1 ? 's' : ''}${filtered ? ' pour votre recherche' : ''}`
              : 'Produits momentanément inaccessibles'}
        </span>
      </div>
      {filtered && (
        <div className={styles.activeFilters}>
          {search && (
            <button
              type="button"
              onClick={() => navigate('', category)}
              aria-label={`Effacer la recherche ${search}`}
            >
              {search} <X size={14} aria-hidden="true" />
            </button>
          )}
          <button className={styles.textLink} type="button" onClick={resetFilters}>
            Effacer les filtres
          </button>
        </div>
      )}
      {resource.state === 'loading' && (
        <div className={styles.state} aria-busy="true">
          <ArrowDown size={24} aria-hidden="true" />
          <p>Nous préparons la sélection.</p>
        </div>
      )}
      {(resource.state === 'error' || resource.state === 'missing') && (
        <CatalogueState
          title="La boutique fait une pause."
          description="Les produits ne peuvent pas être chargés pour le moment. Vérifiez votre connexion et réessayez, ou échangez directement avec notre équipe."
          onRetry={retry}
          contact
        />
      )}
      {resource.state === 'ready' && resource.data.items.length === 0 && (
        <CatalogueState
          title={
            filtered ? 'Aucun produit pour cette recherche.' : 'Les premières pièces arrivent ici.'
          }
          description={
            filtered
              ? 'Essayez un autre mot ou une autre catégorie.'
              : 'Aucun produit n’est publié pour le moment. Notre équipe peut vous renseigner sur WhatsApp.'
          }
          onRetry={filtered ? resetFilters : retry}
          retryLabel={filtered ? 'Effacer les filtres' : 'Actualiser la boutique'}
          contact={!filtered}
        />
      )}
      {resource.state === 'ready' && resource.data.items.length > 0 && (
        <>
          <div className={styles.grid}>
            {resource.data.items.map((product) => (
              <CatalogueCard key={product.id} product={product} />
            ))}
          </div>
          {resource.data.total > resource.data.pageSize && (
            <nav className={styles.pager} aria-label="Pages des produits">
              <button
                type="button"
                className="button button-outline"
                disabled={resource.data.page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Précédent
              </button>
              <span>
                Page {resource.data.page} sur{' '}
                {Math.ceil(resource.data.total / resource.data.pageSize)}
              </span>
              <button
                type="button"
                className="button button-outline"
                disabled={resource.data.page * resource.data.pageSize >= resource.data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                Suivant <ArrowRight size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
