'use client';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Pause, Play, Rotate3D, MoveUpRight } from 'lucide-react';
import { useState } from 'react';
import { useHeroMotion } from './hero-motion';
import { KineticTitle } from './kinetic-title';
import { PillarStarStage } from './pillar-star-stage';
import { gaindePillars } from '@/lib/gainde-pillars';
import type { PillarStarPalette } from '@/lib/pillar-star-scene';
import type { StarPhase } from '@/lib/pillar-star-sequence';
import { PillarPresentation } from './hero-pillars';
import styles from './cinematic-hero.module.css';
const chapters: { id: PillarStarPalette; label: string; word: string; caption: string }[] = [
  {
    id: 'terrain',
    label: 'Le terrain',
    word: 'L’INSTINCT.',
    caption: 'L’énergie du collectif. Le Sénégal sur le cœur.',
  },
  {
    id: 'ville',
    label: 'La ville',
    word: 'L’ALLURE.',
    caption: 'De Dakar à partout. Une identité qui se remarque.',
  },
  {
    id: 'identite',
    label: 'L’identité',
    word: 'LA FIERTÉ.',
    caption: 'Cinq directions. Une même ambition pour le sport.',
  },
];
export function CinematicHero() {
  const [chapter, setChapter] = useState(0),
    [phase, setPhase] = useState<StarPhase>('assembling'),
    [hovering, setHovering] = useState(false),
    [focusing, setFocusing] = useState(false),
    [rotation, setRotation] = useState(0),
    [pillar, setPillar] = useState(0);
  const { playing, paused, reducedMotion, hydrated, togglePause } = useHeroMotion();
  const current = chapters[chapter];
  const pillarsVisible = !hydrated || reducedMotion || phase === 'static' || phase === 'assembled';
  return (
    <div
      className={styles.cinema}
      data-testid="cinematic-hero"
      data-chapter={current.id}
      data-enhanced={hydrated}
      data-phase={phase}
      data-pillars-visible={pillarsVisible}
      data-motion={playing ? 'playing' : 'paused'}
    >
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.topline}>
        <span>
          <i /> DE DAKAR. AVEC CARACTÈRE.
        </span>
        <span>
          LE MOUVEMENT NOUS RASSEMBLE <MoveUpRight size={13} />
        </span>
      </div>
      <div className={styles.backdropWord} aria-hidden="true">
        GAINDÉ
      </div>
      <div className={styles.composition}>
        <div className={styles.copy} data-testid="hero-animated-copy">
          <div className={styles.copyAura} aria-hidden="true" />
          <p className={styles.eyebrow}>
            <span>01 — L’ESPRIT GAINDÉ</span>
            <span className={styles.littleStar}>✳</span>
          </p>
          <KineticTitle />
          <p className={styles.description}>
            L’énergie du Sénégal.
            <br />
            L’allure qui vous ressemble.
          </p>
          <div className={styles.actions}>
            <Link href="/boutique" className={styles.shop}>
              Découvrir la boutique <ArrowUpRight size={22} />
            </Link>
            <Link href="/a-propos" className={styles.spirit}>
              L’esprit Gaindé <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className={styles.copyNote}>
            <span className={styles.flag}>
              <i />
              <i />
              <i />
            </span>
            <span>DU TERRAIN AUX RUES DU SÉNÉGAL.</span>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.verticalLabel} aria-hidden="true">
            UN PAYS. UNE ÉNERGIE. UNE SIGNATURE.
          </div>
          <PillarStarStage
            playing={playing}
            reduced={reducedMotion}
            palette={current.id}
            holding={hovering || focusing}
            onPhase={setPhase}
            rotation={rotation}
          />
          <div
            className={styles.pillarConstellation}
            role="group"
            aria-label="Explorer les cinq piliers"
            aria-hidden={!pillarsVisible}
            inert={!pillarsVisible}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            onFocusCapture={() => setFocusing(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setFocusing(false);
            }}
          >
            {gaindePillars.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={styles.pillarNode}
                data-pillar={item.id}
                aria-pressed={pillar === i}
                aria-controls="hero-pillar-story"
                onClick={() => setPillar(i)}
              >
                <span>0{i + 1}</span>
                <strong>{item.name}</strong>
                <i />
              </button>
            ))}
          </div>
          <div
            id="hero-pillar-story"
            className={styles.pillarStory}
            aria-live="polite"
            aria-atomic="true"
          >
            <span key={pillar}>{gaindePillars[pillar].tagline}</span>
            <p>Notre vision, à construire ensemble.</p>
          </div>
          <div className={styles.artCaption}>
            <span className={styles.captionRule} />
            <span>CINQ PILIERS. UNE SEULE ÉTOILE.</span>
            <span className={styles.captionStar}>★</span>
          </div>
          <div className={styles.tools} role="group" aria-label="Explorer la mise en scène">
            <button
              type="button"
              onClick={() => setRotation((v) => v + 1)}
              aria-label="Faire tourner l’étoile"
              disabled={reducedMotion}
            >
              <Rotate3D size={18} />
            </button>
            <button
              type="button"
              onClick={togglePause}
              aria-label={
                reducedMotion
                  ? 'Animations réduites selon votre préférence'
                  : paused
                    ? 'Reprendre les animations'
                    : 'Mettre les animations en pause'
              }
              aria-pressed={paused || reducedMotion}
              disabled={!hydrated || reducedMotion}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.chapterBar}>
        <div className={styles.chapterName}>
          <span key={current.id}>{current.word}</span>
          <p>{current.caption}</p>
        </div>
        <div className={styles.tabs} role="group" aria-label="Choisir une ambiance">
          {chapters.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={chapter === i}
              onClick={() => setChapter(i)}
            >
              <span>0{i + 1}</span>
              {item.label}
              <i />
            </button>
          ))}
        </div>
        <a href="#univers" className={styles.explore} aria-label="Explorer les univers plus bas">
          <ArrowDown size={18} />
          <span>EXPLORER</span>
        </a>
      </div>
      <div className={styles.vision}>
        <span className={styles.visionTitle}>
          CINQ PILIERS.
          <br />
          <strong>UNE MÊME ÉNERGIE.</strong>
        </span>
        <ul aria-label="Les cinq piliers de Gainde Sportif">
          {gaindePillars.map((p) => (
            <li key={p.id}>
              GAINDE <strong>{p.label}</strong>
            </li>
          ))}
        </ul>
        <PillarPresentation />
      </div>
    </div>
  );
}
