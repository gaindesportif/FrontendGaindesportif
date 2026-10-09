import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Featured } from '@/components/featured';
import { HomeHero } from '@/components/home/home-hero';
import { HomeUniverses } from '@/components/home/home-universes';
import styles from '@/components/home/home.module.css';
export default function Home() {
  return (
    <div className={styles.home}>
      <HomeHero />
      <div className="identity-strip">
        <span>UNE FIERTÉ COMMUNE</span>
        <span className="strip-star">✳</span>
        <span>DU TERRAIN À LA VILLE</span>
        <span className="strip-star">✳</span>
        <span>À CHACUN SON GAINDÉ</span>
        <span className="strip-star">✳</span>
        <span>DAKAR DANS LE CŒUR</span>
      </div>
      <HomeUniverses />
      <Featured />
      <section className="story-section" aria-labelledby="story-heading">
        <div className="story-photo">
          <Image
            src="/images/dakar-portrait.webp"
            alt="La collection Dakar portée au quotidien, dans une rue arborée"
            width={854}
            height={1280}
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <span className="photo-caption">DAKAR / L’ALLURE D’ICI.</span>
        </div>
        <div className="story-copy">
          <span className="eyebrow">03 / L’esprit Gaindé</span>
          <span className="story-symbol" aria-hidden="true">
            ✳
          </span>
          <h2 id="story-heading">
            On ne porte pas
            <br />
            juste un maillot.
            <br />
            <em>On porte une histoire.</em>
          </h2>
          <p>
            Un quartier. Une équipe. Tout un pays.
            <br />
            Gaindé, c’est cette fierté qui nous rassemble et cette énergie qui nous suit partout.
          </p>
          <p>
            Des collections inspirées du Sénégal, pensées pour ceux qui veulent afficher leur
            identité. Simplement. Pleinement.
          </p>
          <Link className="text-link" href="/a-propos">
            Rencontrer l’esprit Gaindé <ArrowUpRight size={20} />
          </Link>
          <div className="story-signature">LE SÉNÉGAL DANS L’ÂME.</div>
        </div>
      </section>
      <section className="team-section section" aria-labelledby="team-heading">
        <div className="team-mark" aria-hidden="true">
          <Sparkles size={35} strokeWidth={1} />
          <span>
            VOTRE ÉQUIPE.
            <br />
            VOTRE IDENTITÉ.
          </span>
        </div>
        <div className="team-copy">
          <span className="eyebrow">04 / Ensemble, plus loin</span>
          <h2 id="team-heading">
            Le même esprit.
            <br />
            Vos propres couleurs.
          </h2>
          <p>
            Club, école, association ou navétane : parlons de vos équipements et de votre
            personnalisation.
          </p>
          <Link href="/contact?subject=personnalisation" className="button button-light">
            Parlons de votre équipe <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="team-detail">
          <div className={styles.teamPitch} aria-hidden="true">
            <span />
            <span />
            <i />
            <i />
            <i />
          </div>
          <span className={styles.teamMotto}>
            LE COLLECTIF.
            <br />
            LA FORCE D’AVANCER ENSEMBLE.
          </span>
        </div>
      </section>
    </div>
  );
}
