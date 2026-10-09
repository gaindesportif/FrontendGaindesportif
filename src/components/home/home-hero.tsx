import Link from 'next/link';
import { ArrowDown, ArrowUpRight, MoveRight, Star } from 'lucide-react';
import { HeroScene } from './hero-scene';
import { HeroMotion } from './hero-motion';
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
          <h1 id="hero-heading">
            <span className={styles.titleLine}>LA FIERTÉ</span>
            <span className={styles.titleAccent}>SE PORTE.</span>
          </h1>
          <div className={styles.copyRule}>
            <span aria-hidden="true">✳</span> DU TERRAIN AUX RUES DE DAKAR.
          </div>
          <p>
            L’énergie du Sénégal. L’allure qui vous ressemble.
            <br className={styles.desktopBreak} /> Des pièces pour porter votre identité, partout.
          </p>
          <div className={styles.actions}>
            <Link href="/collections" className={styles.primaryButton}>
              Découvrir les collections <ArrowUpRight size={21} />
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
