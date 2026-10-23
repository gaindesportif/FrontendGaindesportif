'use client';
import { useEffect, useRef, useState } from 'react';
import type { PillarStarPalette, PillarStarScene } from '@/lib/pillar-star-scene';
import styles from './cinematic-hero.module.css';
import type { StarPhase } from '@/lib/pillar-star-sequence';

export function PillarStarStage({
  playing,
  reduced,
  palette,
  holding,
  onPhase,
  rotation,
}: {
  playing: boolean;
  reduced: boolean;
  palette: PillarStarPalette;
  holding: boolean;
  onPhase: (phase: StarPhase) => void;
  rotation: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<PillarStarScene | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!reduced) return;
    const timer = window.setTimeout(() => setReady(false), 0);
    return () => clearTimeout(timer);
  }, [reduced]);
  const showing3D = ready && !reduced;
  const [visible, setVisible] = useState(false);
  const active = playing && visible;
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const settings = useRef({ playing, palette, holding });
  useEffect(() => {
    settings.current = { playing: active, palette, holding };
  }, [active, palette, holding]);
  useEffect(() => api.current?.motion(active), [active]);
  useEffect(() => api.current?.palette(palette), [palette]);
  useEffect(() => api.current?.hold(holding), [holding]);
  useEffect(() => {
    if (rotation) api.current?.turn();
  }, [rotation]);
  useEffect(() => {
    const element = host.current;
    if (!element || reduced) return;
    let cancelled = false,
      started = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        observer.disconnect();
        try {
          const { createPillarStarScene } = await import('@/lib/pillar-star-scene');
          if (cancelled) return;
          api.current = createPillarStarScene(
            element,
            () => {
              if (!cancelled) {
                setReady(false);
                onPhase('static');
              }
            },
            onPhase,
          );
          api.current.palette(settings.current.palette);
          api.current.hold(settings.current.holding);
          api.current.motion(settings.current.playing);
          setReady(true);
        } catch {
          if (!cancelled) {
            setReady(false);
            onPhase('static');
          }
        }
      },
      { rootMargin: '100px' },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      api.current?.dispose();
      api.current = null;
    };
  }, [reduced, onPhase]);
  return (
    <div
      className={styles.stage}
      data-testid="pillar-star-stage"
      data-renderer={showing3D ? 'webgl' : 'static'}
      data-motion={active ? 'playing' : 'paused'}
      data-palette={palette}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !playing) return;
        const r = e.currentTarget.getBoundingClientRect();
        api.current?.pointer(
          ((e.clientX - r.left) / r.width - 0.5) * 2,
          ((e.clientY - r.top) / r.height - 0.5) * 2,
        );
      }}
      onPointerLeave={() => api.current?.pointer(0, 0)}
    >
      <div className={styles.studioGlow} />
      <div className={styles.orbitOne} aria-hidden="true" />
      <div className={styles.orbitTwo} aria-hidden="true" />
      <div ref={host} className={styles.canvas} aria-hidden="true" />
      <svg
        className={styles.starFallback}
        data-ready={showing3D}
        viewBox="0 0 440 500"
        style={{ rotate: `${rotation * 10}deg` }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pillar-star-light" x2="1" y2="1">
            <stop stopColor="#ffe7a2" />
            <stop offset=".5" stopColor="#b99546" />
            <stop offset="1" stopColor="#f6df99" />
          </linearGradient>
        </defs>
        <g transform="translate(220 224) scale(.76)">
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d="M0 0L-39 -54L0 -160L39 -54Z"
              transform={`rotate(${i * 72})`}
              fill={i % 2 ? '#31845f' : 'url(#pillar-star-light)'}
              stroke="#f1d491"
              strokeWidth="1"
            />
          ))}
        </g>
      </svg>
      <div className={styles.pedestal} aria-hidden="true" />
      <span className={styles.stageMark} aria-hidden="true">
        G.
      </span>
    </div>
  );
}
