'use client';
import { useState } from 'react';
import { Share2 } from 'lucide-react';
import styles from './editorial.module.css';
export function ArticleShare({ title }: { title: string }) {
  const [message, setMessage] = useState('');
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        setMessage('Lien copié.');
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        setMessage('Copiez le lien dans la barre d’adresse pour partager cet article.');
    }
  }
  return (
    <div>
      <button className={styles.secondary} onClick={() => void share()}>
        <Share2 size={15} />
        Partager
      </button>
      <p role="status" className={styles.hint}>
        {message}
      </p>
    </div>
  );
}
