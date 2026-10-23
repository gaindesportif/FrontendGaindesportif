/** Horloge partagée avec la scène : quatre secondes par mouvement, vraie pause de lecture. */
export type StarPhase =
  'assembling' | 'assembled' | 'fading' | 'separating' | 'separated' | 'static';
export const STAR_CYCLE_SECONDS = 26;
const smooth = (t: number) => t * t * (3 - 2 * t);
export function starSequence(seconds: number): { phase: StarPhase; expansion: number } {
  const t = Math.max(0, seconds) % STAR_CYCLE_SECONDS;
  if (t < 4) return { phase: 'assembling', expansion: 1 - smooth(t / 4) };
  if (t < 18) return { phase: 'assembled', expansion: 0 };
  // Les légendes s’effacent entièrement avant que les branches ne bougent.
  if (t < 19) return { phase: 'fading', expansion: 0 };
  if (t < 23) return { phase: 'separating', expansion: smooth((t - 19) / 4) };
  return { phase: 'separated', expansion: 1 };
}
