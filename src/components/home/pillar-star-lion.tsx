'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { LionFrame } from '@/lib/pillar-star-sequence';
import { useLionRoar } from './use-lion-roar';
import styles from './pillar-star-lion.module.css';

const entryDirections = [1, -1, 1, 1, -1, -1] as const;
const atlas = ['/images/accueil/lion-dore.webp', '/images/accueil/objets-lion.webp'];
const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;
const progressClamp = (progress: number) => Math.min(1, Math.max(0, progress));
const smooth = (progress: number) => progress * progress * (3 - 2 * progress);
const position = (x: number, y: number) => `translate3d(${x * 100}%,${y * 100}%,0)`;

export function preloadLionAssets() {
  return Promise.allSettled(
    atlas.map((source) => {
      const image = new Image();
      image.src = source;
      return image.decode();
    }),
  );
}

export function PillarStarLion({
  frameRef,
  paused,
}: {
  frameRef: RefObject<((frame: LionFrame) => void) | null>;
  paused: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const character = useRef<HTMLDivElement>(null);
  const projectile = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const syncRoar = useLionRoar(paused);

  useEffect(() => {
    const stage = scene.current!;
    const actor = character.current!;
    const item = projectile.current!;
    const hit = flash.current!;

    const render = ({ seconds, beat, target, impact }: LionFrame) => {
      syncRoar(beat?.phase === 'roar' ? beat.progress : null);

      stage.hidden = !beat && !impact;
      actor.hidden = !beat;
      item.hidden = beat?.phase !== 'throw';
      hit.hidden = impact <= 0;
      if (impact > 0) {
        hit.style.transform = position(target.x, target.y);
        hit.style.setProperty('--impact', String(impact));
      }
      if (!beat) {
        delete stage.dataset.kind;
        delete stage.dataset.phase;
        return;
      }

      const { index, kind, phase, progress } = beat;
      stage.dataset.kind = kind;
      stage.dataset.phase = phase;
      const direction = entryDirections[index] ?? 1;
      const near = 0.5 - 0.235 * direction;
      const outside = 0.5 - 0.9 * direction;
      const running = phase === 'run' || phase === 'leave';
      const gait = Math.sin(seconds * 5.2 * Math.PI);
      const weight = running ? Math.sin(progress * Math.PI) ** 0.58 : 0;
      const bounce = gait ** 2 * weight;
      const reach = phase === 'throw' ? Math.sin(progress * Math.PI) : 0;
      const x =
        phase === 'run'
          ? interpolate(outside, near, 1 - (1 - progress) ** 1.55)
          : phase === 'leave'
            ? interpolate(near, outside, progress ** 1.45)
            : near + direction * reach * 0.026;
      const y = 0.758 - bounce * 0.022 - reach * 0.055;
      const turn = phase === 'leave' ? smooth(progressClamp(progress / 0.18)) : 0;
      const facing = direction * Math.cos(Math.PI * turn);
      actor.dataset.pose = running ? 'gallop' : phase;
      actor.style.transform = position(x, y);
      actor.style.setProperty('--face', String(facing));
      actor.style.setProperty('--gait-blend', String(smooth(progressClamp(0.5 - gait * 1.8))));
      actor.style.setProperty(
        '--lean',
        `${gait * weight * 1.8 * facing - 5 * reach * direction}deg`,
      );
      actor.style.setProperty(
        '--visibility',
        String(
          phase === 'leave'
            ? 1 - progressClamp((progress - 0.66) / 0.32)
            : progressClamp(Math.abs(x - outside) * 4),
        ),
      );
      actor.style.setProperty('--stride', String(bounce));

      if (phase === 'throw') {
        const startX = near + direction * 0.196;
        const startY = 0.552;
        const flight = progress ** 1.1;
        const airborne = Math.sin(flight * Math.PI);
        const flightX = interpolate(startX, target.x, flight);
        const flightY =
          interpolate(startY, target.y, flight) - airborne * (index === 0 ? 0.16 : 0.21);
        item.style.transform = position(flightX, flightY);
        item.style.setProperty(
          '--item-spin',
          `${direction * (flight * (index === 0 ? 400 : 210) - 12)}deg`,
        );
        item.style.setProperty(
          '--item-scale',
          String(interpolate(0.96, 0.62, flight) + airborne * 0.18),
        );
        item.style.setProperty('--item-x', `${(index % 3) * 50}%`);
        item.style.setProperty('--item-y', `${Math.floor(index / 3) * 100}%`);
        item.style.setProperty('--item-glow', String(0.44 + airborne * 0.47));
      }
    };

    frameRef.current = render;
    return () => {
      if (frameRef.current === render) frameRef.current = null;
    };
  }, [frameRef, syncRoar]);

  return (
    <div
      className={styles.scene}
      ref={scene}
      hidden
      data-testid="lion-narrative"
      aria-hidden="true"
    >
      <div className={styles.anchor} ref={flash} hidden>
        <div className={styles.impact}>
          <span />
          <span />
        </div>
      </div>
      <div className={styles.anchor} ref={character} hidden>
        <span className={styles.shadow} />
        <span className={styles.dust} />
        <div className={styles.lion} />
      </div>
      <div className={styles.anchor} ref={projectile} hidden data-testid="lion-projectile">
        <span className={styles.projectileGlow} />
        <span className={styles.projectile} />
      </div>
    </div>
  );
}
