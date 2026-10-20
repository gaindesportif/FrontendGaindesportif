import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { heroUniverses } from '@/lib/hero-universes';
import styles from './home.module.css';

export function HomeUniverses() {
  return (
    <section id="univers" className={styles.universes} aria-labelledby="universes-heading">
      <div className={styles.universesHeading}>
        <div>
          <span className="eyebrow">01 / Trouvez votre terrain d’expression</span>
          <h2 id="universes-heading">
            Trois univers.
            <br />
            <em>Une même fierté.</em>
          </h2>
        </div>
        <p>
          Sur le terrain, dans la rue ou au quotidien.
          <br />À vous de choisir comment porter Gaindé.
        </p>
      </div>
      <div className={styles.universeGrid}>
        {heroUniverses.map((universe, index) => (
          <Link
            className={styles.universeCard}
            key={universe.id}
            href={`/boutique?category=${universe.id}`}
          >
            <div className={styles.universeImage}>
              <Image
                src={universe.image}
                alt={universe.alt}
                fill
                sizes="(max-width: 760px) 90vw, 30vw"
              />
              <span className={styles.universeIndex}>0{index + 1}</span>
              <div className={styles.universeImageTitle}>
                <h3>{universe.heading}</h3>
                <span>
                  <ArrowUpRight size={24} />
                </span>
              </div>
            </div>
            <div className={styles.universeCardCopy}>
              <strong>{universe.label}</strong>
              <p>{universe.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
