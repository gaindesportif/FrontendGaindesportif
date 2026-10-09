'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { GlassSceneHandle } from '@/lib/glass-scene-engine';
import type { GlassUniverse } from '@/lib/glass-scene-config';
import styles from './home.module.css';

interface Props {
  enabled: boolean;
  playing: boolean;
  universe: GlassUniverse;
  api: RefObject<GlassSceneHandle | null>;
  onStatus: (status: 'ready' | 'fallback') => void;
}

export function GlassScene({ enabled, playing, universe, api, onStatus }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const settings = useRef({ playing, universe });
  useEffect(() => {
    settings.current = { playing, universe };
    api.current?.setMotion(playing);
    api.current?.setUniverse(universe);
  }, [playing, universe, api]);

  useEffect(() => {
    const element = host.current;
    if (!enabled || !element) return;
    let cancelled = false;
    let loading = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        loading = true;
        observer.disconnect();
        try {
          const { createGlassScene } = await import('@/lib/glass-scene-engine');
          if (cancelled) return;
          api.current = createGlassScene(element, () => {
            if (!cancelled) onStatus('fallback');
          });
          api.current.setMotion(settings.current.playing);
          api.current.setUniverse(settings.current.universe);
          onStatus('ready');
        } catch {
          api.current?.dispose();
          api.current = null;
          if (!cancelled) onStatus('fallback');
        }
      },
      { rootMargin: '80px' },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      api.current?.dispose();
      api.current = null;
      onStatus('fallback');
    };
  }, [enabled, api, onStatus]);

  return (
    <div ref={host} className={styles.glassStage} aria-hidden="true" data-testid="glass-stage" />
  );
}
