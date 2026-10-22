'use client';
import { useCategories } from '@/components/catalogue/categories-provider';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { catalogueCategoryLabel, catalogueResponseSchema, formatXof } from '@/lib/catalogue';
import { CatalogueImage } from './catalogue/catalogue-image';
import { useCatalogueResource } from './catalogue/use-catalogue-resource';
import styles from './collections-menu.module.css';

// Mounted only while the disclosure is open: every opening reads current publications.
export function CollectionsMenuContent({ onNavigate }: { onNavigate: () => void }) {
  const { categories } = useCategories();
  const { resource, retry } = useCatalogueResource(
    '/api/catalogue?page=1',
    catalogueResponseSchema.parse,
  );
  return (
    <section
      id="collections-menu"
      className={styles.panel}
      aria-label="Collections de la boutique"
      tabIndex={-1}
    >
      <div className={styles.navigation}>
        <h2>Les collections</h2>
        <Link href="/boutique" onClick={onNavigate} className={styles.allProducts}>
          Tous les produits <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <ul>
          {categories.map((category) => (
            <li key={category.value}>
              <Link href={`/boutique?category=${category.value}`} onClick={onNavigate}>
                {category.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.publications}>
        <h2>Les dernières pièces</h2>
        {resource.state === 'loading' && (
          <p className={styles.message} role="status">
            Chargement des produits…
          </p>
        )}
        {(resource.state === 'error' || resource.state === 'missing') && (
          <div className={styles.message} role="status">
            <p>Les produits sont momentanément indisponibles.</p>
            <button
              type="button"
              className={styles.retry}
              onClick={(event) => {
                // Le bouton est remplacé par le chargement ; garder un focus dans le menu.
                event.currentTarget.closest('section')?.focus({ preventScroll: true });
                retry();
              }}
            >
              Réessayer
            </button>
          </div>
        )}
        {resource.state === 'ready' && resource.data.items.length === 0 && (
          <p className={styles.message} role="status">
            Aucun produit publié pour le moment.
          </p>
        )}
        {resource.state === 'ready' && resource.data.items.length > 0 && (
          <div className={styles.grid}>
            {resource.data.items.slice(0, 3).map((product) => {
              const image = [...product.media]
                .sort((a, b) => a.position - b.position)
                .find((media) => media.type === 'image');
              return (
                <Link
                  key={product.id}
                  href={`/boutique/${product.slug}`}
                  onClick={onNavigate}
                  className={styles.product}
                  aria-label={`Voir ${product.name}`}
                  data-testid="collections-menu-product"
                >
                  <div className={styles.image}>
                    {image && (
                      <CatalogueImage
                        media={{ ...image, alt: image.alt || product.name }}
                        sizes="24vw"
                      />
                    )}
                  </div>
                  <span className={styles.category}>
                    {product.categoryLabel || catalogueCategoryLabel(product.category)}
                  </span>
                  <strong>
                    {product.name} <ArrowUpRight size={16} aria-hidden="true" />
                  </strong>
                  <span className={styles.price}>{formatXof(product.priceXof)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
