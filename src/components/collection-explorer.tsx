'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { categories, filterCollections, isCategory, type Category } from '@/lib/collections';
import { ProductCard } from './product-card';
export function CollectionExplorer() {
  const params = useSearchParams();
  const router = useRouter();
  const parameter = params.get('category');
  const category = isCategory(parameter) ? parameter : 'all';
  const [query, setQuery] = useState('');
  const items = filterCollections(category, query);
  const headings = {
    all: 'À chacun son Gaindé.',
    senegal: 'Le Sénégal, sur le cœur.',
    dakar: 'Dakar a son allure.',
    accessoires: 'Le lion vous accompagne.',
  };
  function filter(id: Category) {
    router.replace(id === 'all' ? '/collections' : `/collections?category=${id}`, {
      scroll: false,
    });
  }
  return (
    <div className="collection-page section">
      <div className="page-intro">
        <span className="eyebrow">La sélection Gaindé / Sénégal · Dakar · Accessoires</span>
        <h1>{headings[category]}</h1>
        <p>
          Des pièces, des couleurs, un même esprit.
          <br />
          Explorez nos univers et gardez vos coups de cœur.
        </p>
      </div>
      <div className="collection-tools">
        <div className="filter-row" role="group" aria-label="Filtrer les collections">
          {categories.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'active' : ''}
              onClick={() => filter(c.id)}
              aria-pressed={category === c.id}
            >
              {c.label}
              <span>{filterCollections(c.id).length}</span>
            </button>
          ))}
        </div>
        <div className="collection-search">
          <Search size={17} />
          <input
            aria-label="Rechercher dans les collections"
            placeholder="Une idée en tête ?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Effacer la recherche"
              onClick={() => setQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="results-label" role="status">
        {items.length} aperçu{items.length !== 1 ? 's' : ''} de collection
      </div>
      <div className="product-grid">
        {items.map((p, i) => (
          <ProductCard key={p.id} item={p} index={i} />
        ))}
      </div>
      {!items.length && (
        <div className="empty-state">
          <h2>On n’a pas encore trouvé votre match.</h2>
          <p>Changez de collection ou effacez votre recherche.</p>
          <button
            className="button button-dark"
            onClick={() => {
              setQuery('');
              filter('all');
            }}
          >
            Tout découvrir
          </button>
        </div>
      )}
      <div className="collection-footnote">
        <p>
          Ces visuels présentent notre univers. Les tarifs, tailles et disponibilités sont à
          confirmer avec l’équipe.
        </p>
        <Link href="/contact" className="text-link">
          Un renseignement ? <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
