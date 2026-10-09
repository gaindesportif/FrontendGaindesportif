'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { categories, filterCollections, type Category } from '@/lib/collections';
import { ProductCard } from './product-card';
export function Featured() {
  const [category, setCategory] = useState<Category>('all');
  const items = filterCollections(category).slice(0, 4);
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
        <Link className="text-link desktop-discover" href="/collections">
          Tout découvrir <ArrowUpRight size={19} />
        </Link>
      </div>
      <div className="filter-row" role="group" aria-label="Filtrer la sélection">
        {categories.map((c) => (
          <button
            key={c.id}
            aria-pressed={category === c.id}
            className={category === c.id ? 'active' : ''}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
            <span>{filterCollections(c.id).length}</span>
          </button>
        ))}
      </div>
      <div className="product-grid grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-5">
        {items.map((p, i) => (
          <ProductCard key={p.id} item={p} index={i} />
        ))}
      </div>
      <div className="collection-footnote">
        <p>
          Un premier regard sur nos univers. Pour les prix, les tailles et les disponibilités,
          parlons-en.
        </p>
        <Link href="/contact" className="text-link">
          Contacter l’équipe <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}
