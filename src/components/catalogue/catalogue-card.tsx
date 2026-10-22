'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { catalogueCategoryLabel, formatXof, type PublicProduct } from '@/lib/catalogue';
import { CatalogueImage } from './catalogue-image';
import styles from './catalogue.module.css';
import favoriteStyles from './favorites.module.css';
import { SaveProductButton } from './save-product-button';

export function CatalogueCard({
  product,
  headingLevel = 2,
  sizes = '(max-width: 900px) 45vw, 30vw',
  onNavigate,
}: {
  product: PublicProduct;
  headingLevel?: 2 | 3;
  sizes?: string;
  onNavigate?: () => void;
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const image = [...product.media]
    .sort((a, b) => a.position - b.position)
    .find((item) => item.type === 'image');
  return (
    <article className={styles.card} data-testid="catalogue-card">
      <div className={favoriteStyles.cardVisual}>
        <Link
          href={`/boutique/${product.slug}`}
          className={styles.cardVisual}
          aria-label={`Voir ${product.name}`}
          onClick={onNavigate}
        >
          {image && (
            <CatalogueImage media={{ ...image, alt: image.alt || product.name }} sizes={sizes} />
          )}
        </Link>
        <SaveProductButton product={product} />
      </div>
      <div className={styles.cardInfo}>
        <span className={styles.category}>
          {product.categoryLabel || catalogueCategoryLabel(product.category)}
        </span>
        <Heading className={styles.cardName}>
          <Link href={`/boutique/${product.slug}`} onClick={onNavigate}>
            {product.name}
          </Link>
          <ArrowUpRight size={17} aria-hidden="true" />
        </Heading>
        <p className={styles.price}>{formatXof(product.priceXof)}</p>
        {product.availability === 'unavailable' && (
          <span className="small">Indisponible actuellement</span>
        )}
      </div>
    </article>
  );
}
