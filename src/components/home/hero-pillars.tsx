import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, LandPlot, MicVocal, MonitorCog, Sparkles } from 'lucide-react';
import { gaindePillars } from '@/lib/gainde-pillars';
import styles from './home.module.css';

const icons = [MonitorCog, LandPlot, CalendarDays, MicVocal, Sparkles];

/** Les légendes restent dans le HTML : visibles sans WebGL, lisibles au clavier et au lecteur d’écran. */
export function HeroPillars() {
  return (
    <div className={styles.pillarMap}>
      <ul className={styles.pillarBranches} aria-label="Les cinq piliers de Gainde Sportif">
        {gaindePillars.map((pillar, index) => {
          const Icon = icons[index];
          return (
            <li key={pillar.id} data-pillar={pillar.id}>
              <Icon size={18} aria-hidden="true" strokeWidth={1.6} />
              <span>
                GAINDE <strong>{pillar.label}</strong>
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        className={styles.boutiqueCore}
        href="/boutique"
        aria-label="Gainde Sportif Boutique : découvrir les produits"
      >
        <Image src="/images/logo.webp" alt="" width={38} height={38} />
        <strong>BOUTIQUE</strong>
        <span>
          Voir la boutique <ArrowUpRight size={11} aria-hidden="true" />
        </span>
      </Link>
    </div>
  );
}

export function PillarPresentation() {
  return (
    <details className={styles.pillarPresentation}>
      <summary>Une boutique au cœur de cinq piliers</summary>
      <div>
        <p>
          Notre priorité aujourd’hui : la boutique, ses équipements, vêtements et accessoires, la
          personnalisation et le flocage, les produits dérivés et le merchandising.
        </p>
        <p>
          Les cinq piliers présentent notre vision. Leurs services se construiront progressivement.
        </p>
        <dl>
          {gaindePillars.map((pillar) => (
            <div key={pillar.id}>
              <dt>
                {pillar.name} <span>— {pillar.tagline}</span>
              </dt>
              <dd>{pillar.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
