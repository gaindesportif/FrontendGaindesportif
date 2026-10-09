'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import styles from './home.module.css';

interface HeroMotionState {
  hydrated: boolean;
  reducedMotion: boolean;
  paused: boolean;
  playing: boolean;
  togglePause: () => void;
}

const HeroMotionContext = createContext<HeroMotionState | null>(null);
const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
function reducedMotionSnapshot() {
  return window.matchMedia(motionQuery).matches;
}
function serverSnapshot() {
  return false;
}
function subscribeHydration() {
  return () => {};
}
function clientSnapshot() {
  return true;
}

/** Un seul contrôle de pause pour le texte, les volumes et le carrousel. */
export function HeroMotion({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    reducedMotionSnapshot,
    serverSnapshot,
  );
  const playing = hydrated && !paused && !reducedMotion && visible;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let inViewport = true;
    const onVisibility = () => setVisible(inViewport && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      onVisibility();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <HeroMotionContext.Provider
      value={{
        hydrated,
        reducedMotion,
        paused,
        playing,
        togglePause: () => setPaused((value) => !value),
      }}
    >
      <section
        ref={root}
        className={styles.hero}
        aria-labelledby="hero-heading"
        data-testid="home-hero"
        data-enhanced={hydrated}
        data-motion={playing ? 'playing' : 'paused'}
      >
        {children}
      </section>
    </HeroMotionContext.Provider>
  );
}

export function useHeroMotion() {
  const motion = useContext(HeroMotionContext);
  if (!motion) throw new Error('HeroMotion absent');
  return motion;
}
