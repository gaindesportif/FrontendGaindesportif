'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { heroUniverses } from '@/lib/hero-universes';
import type { GlassSceneHandle } from '@/lib/glass-scene-engine';
import { GlassScene } from './glass-scene';
import { HeroEmblem } from './hero-emblem';
import { HeroPillars, PillarPresentation } from './hero-pillars';
import { useHeroMotion } from './hero-motion';
import styles from './home.module.css';

const universeDuration = 6000;

export function HeroScene() {
  const [selected, setSelected] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [glassStatus, setGlassStatus] = useState<'ready' | 'fallback'>('fallback');
  const onGlassStatus = useCallback((status: 'ready' | 'fallback') => setGlassStatus(status), []);
  const glassApi = useRef<GlassSceneHandle | null>(null);
  const { hydrated, reducedMotion, paused, playing: animate, togglePause } = useHeroMotion();
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const universe = heroUniverses[selected];
  const glassReady = glassStatus === 'ready' && !reducedMotion;
  const autoplay = animate && visible && !hovered && !focused && !touching;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => {
      setSelected((index) => (index + 1) % heroUniverses.length);
    }, universeDuration);
    return () => window.clearTimeout(timer);
  }, [autoplay, selected, cycle]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let inViewport = true;
    const syncVisibility = () => {
      setVisible(inViewport && !document.hidden);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        syncVisibility();
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncVisibility);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  function resetTilt() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    root.current?.style.setProperty('--tilt-x', '0deg');
    root.current?.style.setProperty('--tilt-y', '0deg');
    glassApi.current?.setPointer(0, 0);
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (!animate || event.pointerType !== 'mouse' || !root.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      root.current?.style.setProperty('--tilt-x', `${-y * 7}deg`);
      root.current?.style.setProperty('--tilt-y', `${x * 10}deg`);
      glassApi.current?.setPointer(x, y);
      frame.current = null;
    });
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    setTouching(false);
    if (!touchStart.current) return;
    const dx = event.clientX - touchStart.current.x;
    const dy = event.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      setSelected((current) => (current + (dx < 0 ? 1 : 2)) % heroUniverses.length);
      setCycle((value) => value + 1);
    }
  }

  return (
    <div
      ref={root}
      className={styles.scene}
      data-testid="hero-scene"
      data-motion={animate ? 'playing' : 'paused'}
      data-universe={universe.id}
      data-visible={visible}
      data-renderer={glassReady ? 'webgl' : 'static'}
      data-autoplay={autoplay ? 'playing' : 'paused'}
      style={{ '--universe-duration': `${universeDuration}ms` } as CSSProperties}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className={styles.sceneTop}>
        <span>
          <span className={styles.liveDot} /> CINQ PILIERS. UNE MÊME ÉNERGIE.
        </span>
        <button
          type="button"
          className={styles.motionControl}
          aria-label={
            !hydrated
              ? 'Animation 3D disponible avec JavaScript'
              : reducedMotion
                ? 'Animations réduites selon votre préférence'
                : paused
                  ? 'Reprendre les animations et le défilement'
                  : 'Mettre les animations et le défilement en pause'
          }
          aria-pressed={paused || reducedMotion}
          disabled={!hydrated || reducedMotion}
          onClick={() => {
            resetTilt();
            togglePause();
          }}
        >
          {animate ? <Pause size={13} /> : <Play size={13} />}
          <span>
            {!hydrated || reducedMotion ? 'Sans mouvement' : paused ? 'Reprendre' : 'Pause'}
          </span>
        </button>
      </div>

      <div
        className={styles.viewport}
        data-testid="hero-viewport"
        onPointerMove={movePointer}
        onPointerLeave={(event) => {
          resetTilt();
          if (event.pointerType !== 'mouse') {
            touchStart.current = null;
            setTouching(false);
          }
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse') {
            setTouching(true);
            touchStart.current = { x: event.clientX, y: event.clientY };
          }
        }}
        onPointerUp={finishSwipe}
        onPointerCancel={() => {
          touchStart.current = null;
          setTouching(false);
          resetTilt();
        }}
      >
        <div className={styles.glassHalo} aria-hidden="true" />
        <GlassScene
          enabled={hydrated && !reducedMotion}
          playing={animate}
          universe={universe.id}
          api={glassApi}
          onStatus={onGlassStatus}
        />
        <HeroEmblem />
        <HeroPillars />
      </div>

      <div className={styles.sceneBottom}>
        <div className={styles.collectionHighlight}>
          <Link
            className={styles.lookCard}
            href={`/boutique?category=${universe.id}`}
            aria-label={`Voir les pièces ${universe.label}`}
          >
            <span className={styles.lookPhoto} key={universe.id}>
              <Image src={universe.image} alt={universe.alt} fill sizes="130px" />
            </span>
            <span>
              {universe.label} <ArrowUpRight size={12} />
            </span>
          </Link>
          <div
            className={styles.sceneCaption}
            aria-live={autoplay ? 'off' : 'polite'}
            aria-atomic="true"
          >
            <span>
              0{selected + 1} / {universe.label}
            </span>
            <Link
              href={`/boutique?category=${universe.id}`}
              aria-label={`Découvrir la collection ${universe.label}`}
            >
              {universe.title} <ArrowUpRight size={20} />
            </Link>
          </div>
        </div>
        <div
          className={styles.universeButtons}
          role="group"
          aria-label="Choisir l’univers de la scène 3D"
        >
          {heroUniverses.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={selected === index}
              aria-label={`Voir l’univers ${item.label}`}
              onClick={() => {
                setSelected(index);
                setCycle((value) => value + 1);
              }}
            >
              <span>0{index + 1}</span> {item.label}
              <i key={cycle} className={styles.universeProgress} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className={styles.autoplayStatus} aria-live="off">
          {autoplay
            ? 'Défilement automatique · 6 s'
            : reducedMotion
              ? 'Défilement manuel'
              : paused || !visible
                ? 'Défilement en pause'
                : 'Défilement suspendu pendant l’interaction'}
        </p>
        <PillarPresentation />
      </div>
    </div>
  );
}
