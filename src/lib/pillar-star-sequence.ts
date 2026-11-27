import { gaindePillars } from './gainde-pillars';

/** Horloge partagée avec la scène : quatre secondes par mouvement, vraie pause de lecture. */
export type StarPhase =
  'assembling' | 'assembled' | 'fading' | 'separating' | 'separated' | 'static';
export const STAR_CYCLE_SECONDS = 26;
const assemblySeconds = 4;
const smooth = (t: number) => t * t * (3 - 2 * t);
export function starSequence(seconds: number): { phase: StarPhase; expansion: number } {
  const t = Math.max(0, seconds) % STAR_CYCLE_SECONDS;
  if (t < assemblySeconds)
    return { phase: 'assembling', expansion: 1 - smooth(t / assemblySeconds) };
  if (t < 18) return { phase: 'assembled', expansion: 0 };
  // Les légendes s’effacent entièrement avant que les branches ne bougent.
  if (t < 19) return { phase: 'fading', expansion: 0 };
  if (t < 23) return { phase: 'separating', expansion: smooth((t - 19) / 4) };
  return { phase: 'separated', expansion: 1 };
}

export const LION_THEMES = gaindePillars.map(({ id }) => id);
type LionObject = 'ball' | (typeof LION_THEMES)[number];

export interface LionBeat {
  kind: LionObject;
  /** Zéro pour le ballon, puis une position par facette dans l’ordre des piliers. */
  index: number;
  phase: 'run' | 'throw' | 'roar' | 'leave';
  progress: number;
}

export interface LionFrame {
  seconds: number;
  beat: LionBeat | null;
  impact: number;
  target: { x: number; y: number };
}

const opening = { run: 2.05, throw: 0.95, roar: 1.07, leave: 1.1 };
const returnVisit = { run: 1.8, throw: 0.9, leave: 1.05 };
const firstReturnSeconds = 8;
const returnSpacingSeconds = 5.4;
const openingContactSeconds = opening.run + opening.throw;
export const LION_STORY_SECONDS =
  firstReturnSeconds + (LION_THEMES.length - 1) * returnSpacingSeconds + 5.2;

function visit(
  elapsed: number,
  kind: LionObject,
  index: number,
  timings: { run: number; throw: number; roar?: number; leave: number },
): Pick<LionFrame, 'beat' | 'impact'> {
  const release = timings.run;
  const contact = release + timings.throw;
  const departure = contact + (timings.roar ?? 0);
  const end = departure + timings.leave;
  const impact = elapsed >= contact ? Math.max(0, 1 - (elapsed - contact) / 0.6) : 0;
  if (elapsed >= end) return { beat: null, impact };
  const { phase, progress }: Pick<LionBeat, 'phase' | 'progress'> =
    elapsed < release
      ? { phase: 'run', progress: elapsed / release }
      : elapsed < contact
        ? { phase: 'throw', progress: (elapsed - release) / timings.throw }
        : timings.roar && elapsed < departure
          ? { phase: 'roar', progress: (elapsed - contact) / timings.roar }
          : { phase: 'leave', progress: (elapsed - departure) / timings.leave };
  return { beat: { kind, index, phase, progress }, impact };
}

export function lionSequence(seconds: number): Pick<LionFrame, 'beat' | 'impact'> {
  if (seconds < firstReturnSeconds) return visit(Math.max(0, seconds), 'ball', 0, opening);
  const timeSinceFirstReturn = seconds - firstReturnSeconds;
  const index = Math.floor(timeSinceFirstReturn / returnSpacingSeconds);
  const theme = LION_THEMES[index];
  if (!theme) return { beat: null, impact: 0 };
  return visit(timeSinceFirstReturn % returnSpacingSeconds, theme, index + 1, returnVisit);
}

/** Au premier rugissement, les branches rejoignent le cœur. Le cycle continue après les cinq visites. */
export function narratedStarSequence(seconds: number): {
  phase: StarPhase;
  expansion: number;
  animatedSeconds: number;
} {
  const animatedSeconds = Math.max(0, seconds - openingContactSeconds);
  if (animatedSeconds < assemblySeconds) {
    return {
      phase: 'assembling',
      expansion: 1 - smooth(animatedSeconds / assemblySeconds),
      animatedSeconds,
    };
  }
  if (seconds < LION_STORY_SECONDS) {
    return { phase: 'assembled', expansion: 0, animatedSeconds };
  }
  const cycle = starSequence(assemblySeconds + seconds - LION_STORY_SECONDS);
  return { ...cycle, animatedSeconds };
}
