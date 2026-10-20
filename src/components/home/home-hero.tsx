import Link from 'next/link';
import { ArrowDown, ArrowUpRight, MoveRight, Star } from 'lucide-react';
import { HeroScene } from './hero-scene';
import { HeroMotion } from './hero-motion';
import { KineticTitle } from './kinetic-title';
import styles from './home.module.css';

export function HomeHero() {
  return (
    <HeroMotion>
      <div className={styles.heroInner}>
        <div className={styles.copy}>
          <span className={styles.kicker}>
            <span className={styles.flag} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>{' '}
            DE DAKAR. AVEC CARACTÈRE.
          </span>
          <KineticTitle />
          <div className={styles.copyRule}>
            <span aria-hidden="true">✳</span> DU TERRAIN AUX RUES DU SÉNÉGAL.
          </div>
          <p>
            <span className={styles.copySentence}>
              L’énergie du Sénégal. L’allure qui vous ressemble.
            </span>{' '}
            <span className={styles.copySentence}>
              Des pièces pour porter votre identité, partout.
            </span>
          </p>
          <div className={styles.actions}>
            <Link href="/boutique" className={styles.primaryButton}>
              Découvrir la boutique <ArrowUpRight size={21} />
            </Link>
            <Link href="/a-propos" className={styles.secondaryButton}>
              L’esprit Gaindé <MoveRight size={20} />
            </Link>
          </div>
          <div className={styles.heroFoot}>
            <span>
              <Star size={15} fill="currentColor" strokeWidth={0} /> UNE FIERTÉ. MILLE FAÇONS DE LA
              PORTER.
            </span>
            <a href="#univers" aria-label="Explorer les univers plus bas">
              <ArrowDown size={17} /> Explorer
            </a>
          </div>
        </div>
        <HeroScene />
      </div>
      <div className={styles.heroBaseline} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </HeroMotion>
  );
}
