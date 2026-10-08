import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, MoveDown, Sparkles } from 'lucide-react';
import { Featured } from '@/components/featured';
export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">
            <span className="status-dot" /> De Dakar. Avec caractère.
          </span>
          <h1 id="hero-heading">
            LA FIERTÉ
            <br />
            SE PORTE<span className="hero-period">.</span>
          </h1>
          <p>
            Sur le terrain. Dans la rue. Au quotidien.
            <br />
            Bien plus qu’un style, une façon de dire
            <br className="desktop-break" /> d’où l’on vient.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/collections">
              Trouver mon Gaindé <ArrowUpRight size={20} />
            </Link>
            <Link href="/a-propos" className="hero-story-link">
              Notre histoire <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-bottom">
            <span className="hero-coordinate">
              DAKAR, SÉNÉGAL
              <br />
              <strong>14°43′ N · 17°28′ W</strong>
            </span>
            <a
              href="#collections"
              className="scroll-link"
              aria-label="Découvrir les collections plus bas"
            >
              <MoveDown size={18} /> Explorer
            </a>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/hero-dakar.webp"
            alt="Deux personnes portant les t-shirts Dakar, noir et blanc, dans les rues du Grand Dakar"
            width={720}
            height={1080}
            priority
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <div className="hero-photo-top">
            <span>LES RUES ONT DU STYLE.</span>
            <span>01 — DAKAR</span>
          </div>
          <Link className="hero-photo-label" href="/collections?category=dakar">
            <span>
              <small>L’énergie de la ville.</small>
              <strong>La collection Dakar</strong>
            </span>
            <span className="round-arrow">
              <ArrowUpRight size={24} />
            </span>
          </Link>
          <div className="hero-tricolor" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
      <div className="identity-strip">
        <span>UNE FIERTÉ COMMUNE</span>
        <span className="strip-star">✳</span>
        <span>DU TERRAIN À LA VILLE</span>
        <span className="strip-star">✳</span>
        <span>À CHACUN SON GAINDÉ</span>
        <span className="strip-star">✳</span>
        <span>DAKAR DANS LE CŒUR</span>
      </div>
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
          <span className="eyebrow">02 / L’esprit Gaindé</span>
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
          <span className="eyebrow">03 / Ensemble, plus loin</span>
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
          <span className="team-number">
            11<span>+</span>
          </span>
          <span>
            INDIVIDUALITÉS.
            <br />
            UNE MÊME ÉQUIPE.
          </span>
          <div className="team-lines" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}
