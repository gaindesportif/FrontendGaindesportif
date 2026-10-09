import type { CSSProperties } from 'react';
import styles from './home.module.css';

const lines = ['LA FIERTÉ', 'SE PORTE.'] as const;

/** HTML serveur : le titre complet reste disponible avant toute animation. */
export function KineticTitle() {
  return (
    <h1 id="hero-heading" aria-label={lines.join(' ')} data-testid="kinetic-title">
      {lines.map((line, lineIndex) => (
        <span
          key={line}
          className={lineIndex === 0 ? styles.titleLine : styles.titleAccent}
          aria-hidden="true"
        >
          <span
            className={styles.titlePanel}
            data-motion-line={lineIndex + 1}
            style={{ '--line-delay': `${lineIndex * 220}ms` } as CSSProperties}
          >
            {line}
          </span>
        </span>
      ))}
    </h1>
  );
}
