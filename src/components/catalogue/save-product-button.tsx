'use client';

import { Heart } from 'lucide-react';
import type { PublicProduct } from '@/lib/catalogue';
import { useStore } from '@/components/store-provider';
import styles from './favorites.module.css';

export function SaveProductButton({
  product,
  showLabel = false,
}: {
  product: PublicProduct;
  showLabel?: boolean;
}) {
  const { saved, toggleSaved, saving, accountLoading } = useStore();
  const selected = saved.some((reference) => reference.id === product.id);
  return (
    <button
      type="button"
      className={showLabel ? styles.detailButton : styles.cardButton}
      disabled={accountLoading || saving.includes(product.id)}
      aria-busy={saving.includes(product.id)}
      aria-pressed={selected}
      aria-label={`${selected ? 'Retirer' : 'Ajouter'} ${product.name} ${selected ? 'de' : 'à'} ma sélection`}
      onClick={() => toggleSaved(product)}
    >
      <Heart size={21} fill={selected ? 'currentColor' : 'none'} aria-hidden="true" />
      {showLabel && (
        <span>{selected ? 'Retirer de ma sélection' : 'Garder dans ma sélection'}</span>
      )}
    </button>
  );
}
