'use client';
import { useCategories } from '@/components/catalogue/categories-provider';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { catalogueResponseSchema } from '@/lib/catalogue';
import { CatalogueCard } from './catalogue/catalogue-card';
import { CatalogueState } from './catalogue/catalogue-state';
import { useCatalogueResource } from './catalogue/use-catalogue-resource';
export function Featured() {
  const { categories } = useCategories();
  const [category, setCategory] = useState('');
  const query = new URLSearchParams({ page: '1' });
  if (category) query.set('category', category);
  const { resource, retry } = useCatalogueResource(
    `/api/catalogue?${query}`,
    catalogueResponseSchema.parse,
  );
  return (
    <section
      className="section featured-section"
      id="collections"
      aria-labelledby="featured-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">02 / La sélection Gaindé</span>
          <h2 id="featured-heading">À chacun son Gaindé.</h2>
        </div>
        <Link className="text-link desktop-discover" href="/boutique">
          Tout découvrir <ArrowUpRight size={19} />
        </Link>
      </div>
      <div className="filter-row" role="group" aria-label="Filtrer la sélection">
        {[{ value: '', label: 'Tout' }, ...categories].map((c) => (
          <button
            key={c.value}
            aria-pressed={category === c.value}
            className={category === c.value ? 'active' : ''}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {resource.state === 'loading' && <p role="status">Chargement des produits…</p>}
      {(resource.state === 'error' || resource.state === 'missing') && (
        <CatalogueState
          title="Les produits font une pause."
          description="La sélection est momentanément inaccessible. Réessayez dans un instant."
          onRetry={retry}
          contact
        />
      )}
      {resource.state === 'ready' && resource.data.items.length === 0 && (
        <CatalogueState
          title={
            category ? 'Aucun produit dans cette catégorie.' : 'Les premières pièces arrivent ici.'
          }
          description="Découvrez prochainement nos produits ou échangez avec notre équipe sur WhatsApp."
          onRetry={retry}
          retryLabel="Actualiser la sélection"
          contact
        />
      )}
      {resource.state === 'ready' && resource.data.items.length > 0 && (
        <div className="product-grid grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-5">
          {resource.data.items.slice(0, 4).map((product) => (
            <CatalogueCard
              key={product.id}
              product={product}
              headingLevel={3}
              sizes="(max-width: 760px) 45vw, 23vw"
            />
          ))}
        </div>
      )}
      <div className="collection-footnote">
        <p>Retrouvez les détails, les options et les photos de chaque pièce dans la boutique.</p>
        <Link href="/boutique" className="text-link">
          Voir toute la boutique <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}
