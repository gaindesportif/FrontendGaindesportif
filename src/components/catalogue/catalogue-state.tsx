import Link from 'next/link';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { contactDetails } from '@/lib/contact';
import styles from './catalogue.module.css';

export function CatalogueState({
  title,
  description,
  onRetry,
  retryLabel = 'Réessayer',
  contact = false,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  contact?: boolean;
}) {
  return (
    <div className={styles.state}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.links}>
        {onRetry && (
          <button type="button" className="button button-dark" onClick={onRetry}>
            {retryLabel} <RefreshCw size={16} aria-hidden="true" />
          </button>
        )}
        {contact && (
          <a
            className={styles.textLink}
            href={contactDetails.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            Échanger sur WhatsApp <ArrowUpRight size={14} className="inline" aria-hidden="true" />
          </a>
        )}
        <Link href="/contact" className={styles.textLink}>
          Nous contacter
        </Link>
      </div>
    </div>
  );
}
