'use client';

import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import styles from './editorial.module.css';

export function ArticleShare({
  title,
  path,
  image,
}: {
  title: string;
  path: string;
  image?: string;
}) {
  const [message, setMessage] = useState('');
  const photo = useRef<Promise<File | undefined>>(undefined);
  const busy = useRef(false);

  function prepare() {
    if (!image || !navigator.share || !navigator.canShare) return;
    photo.current ??= fetch(image, { signal: AbortSignal.timeout(800), credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) return;
        const blob = await response.blob();
        if (blob.type === 'image/jpeg' && blob.size > 0 && blob.size < 5_000_000)
          return new File([blob], 'article-gainde-media.jpg', { type: blob.type });
      })
      .catch(() => undefined);
  }

  async function share() {
    if (busy.current) return;
    busy.current = true;
    setMessage('');
    const url = new URL(path, process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).href;
    try {
      if (navigator.share) {
        prepare();
        const file = await photo.current;
        if (file && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ title, text: title, url, files: [file] });
            return;
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
          }
        }
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage('Lien copié.');
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        try {
          await navigator.clipboard.writeText(url);
          setMessage('Lien copié.');
        } catch {
          setMessage('Copiez le lien dans la barre d’adresse pour partager cet article.');
        }
      }
    } finally {
      busy.current = false;
    }
  }

  return (
    <div>
      <button
        className={`${styles.secondary} button-fill`}
        type="button"
        onPointerEnter={prepare}
        onFocus={prepare}
        onClick={() => void share()}
      >
        <Share2 size={15} aria-hidden="true" />
        Partager
      </button>
      <p role="status" className={styles.hint}>
        {message}
      </p>
    </div>
  );
}
