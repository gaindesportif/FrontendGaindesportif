'use client';

import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { PublicMedia } from '@/lib/catalogue';
import styles from './catalogue.module.css';

export function CatalogueImage({
  media,
  sizes,
  priority = false,
}: {
  media: PublicMedia;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span
        className={styles.mediaError}
        role="img"
        aria-label={media.alt || 'Photo du produit indisponible'}
      >
        <ImageOff size={24} aria-hidden="true" />
        <span>Photo indisponible</span>
      </span>
    );
  return (
    <Image
      src={media.url}
      alt={media.alt}
      fill
      unoptimized
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}
