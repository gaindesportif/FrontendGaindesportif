'use client';
import Image from 'next/image';
import { ArrowUpRight, Heart } from 'lucide-react';
import { type CollectionItem } from '@/lib/collections';
import { useStore } from './store-provider';
export function ProductCard({ item, index = 0 }: { item: CollectionItem; index?: number }) {
  const { saved, toggle, preview } = useStore();
  const selected = saved.includes(item.id);
  return (
    <article
      className="product-card min-w-0"
      style={{ '--card-delay': `${index * 60}ms` } as React.CSSProperties}
    >
      <div className="product-visual">
        <button
          className="product-image-button"
          onClick={() => preview(item)}
          aria-label={`Découvrir ${item.name}`}
        >
          <Image
            className="product-image-main"
            src={item.image}
            alt={item.imageAlt}
            width={540}
            height={650}
            sizes="(max-width: 600px) 50vw, (max-width: 1000px) 50vw, 25vw"
          />
          <Image
            className="product-image-alternate"
            src={item.alternate}
            alt=""
            width={540}
            height={650}
            sizes="(max-width: 1000px) 50vw, 25vw"
          />
          <span className="card-preview">
            Un regard de plus <ArrowUpRight size={16} />
          </span>
        </button>
        {item.tag && <span className="product-tag">{item.tag}</span>}
        <button
          className={`favorite-button ${selected ? 'selected' : ''}`}
          onClick={() => toggle(item.id)}
          aria-pressed={selected}
          aria-label={`${selected ? 'Retirer' : 'Ajouter'} ${item.name} ${selected ? 'de' : 'à'} ma sélection`}
        >
          <Heart size={19} fill={selected ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      </div>
      <div className="product-meta">
        <small>{item.categoryLabel}</small>
        <button onClick={() => preview(item)} className="product-name">
          {item.name}
          <ArrowUpRight size={17} />
        </button>
        <div className="product-bottom">
          <span>Aperçu de collection</span>
          <div className="swatches" aria-hidden="true">
            {item.colors.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
