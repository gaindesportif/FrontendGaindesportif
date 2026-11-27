import { describe, it, expect } from 'vitest';
import {
  LION_STORY_SECONDS,
  lionSequence,
  narratedStarSequence,
  starSequence,
  STAR_CYCLE_SECONDS,
} from './pillar-star-sequence';
describe('chorégraphie de l’étoile', () => {
  it('termine réellement l’assemblage avant de présenter les piliers', () => {
    expect(starSequence(0)).toEqual({ phase: 'assembling', expansion: 1 });
    expect(starSequence(2).expansion).toBeCloseTo(0.5);
    expect(starSequence(3.99).phase).toBe('assembling');
    expect(starSequence(4)).toEqual({ phase: 'assembled', expansion: 0 });
    expect(starSequence(17.99)).toEqual({ phase: 'assembled', expansion: 0 });
  });
  it('laisse une seconde aux légendes pour disparaître avant la séparation lente', () => {
    expect(starSequence(18)).toEqual({ phase: 'fading', expansion: 0 });
    expect(starSequence(18.99).expansion).toBe(0);
    expect(starSequence(21)).toEqual({ phase: 'separating', expansion: 0.5 });
    expect(starSequence(23)).toEqual({ phase: 'separated', expansion: 1 });
    expect(starSequence(STAR_CYCLE_SECONDS)).toEqual(starSequence(0));
  });
});

describe('enchaînement du lion', () => {
  it('attend le ballon et son rugissement pour assembler l’étoile', () => {
    expect(lionSequence(0).beat).toEqual({ kind: 'ball', index: 0, phase: 'run', progress: 0 });
    expect(lionSequence(2.9).beat?.phase).toBe('throw');
    expect(narratedStarSequence(2.9)).toEqual({
      phase: 'assembling',
      expansion: 1,
      animatedSeconds: 0,
    });
    expect(lionSequence(3)).toEqual({
      beat: { kind: 'ball', index: 0, phase: 'roar', progress: 0 },
      impact: 1,
    });
    expect(narratedStarSequence(5).expansion).toBeCloseTo(0.5);
    expect(narratedStarSequence(7).phase).toBe('assembled');
  });

  it('alterne cinq retours, chacun suivi d’une vraie absence', () => {
    const kinds = ['tech', 'infra', 'event', 'media', 'kids'];
    for (const [index, kind] of kinds.entries()) {
      const start = 8 + index * 5.4;
      expect(lionSequence(start + 0.1).beat).toMatchObject({
        kind,
        index: index + 1,
        phase: 'run',
      });
      expect(lionSequence(start + 1.9).beat?.phase).toBe('throw');
      expect(lionSequence(start + 2.9)).toMatchObject({
        beat: { kind, phase: 'leave' },
        impact: expect.any(Number),
      });
      expect(lionSequence(start + 2.9).impact).toBeGreaterThan(0);
      expect(lionSequence(start + 4)).toEqual({ beat: null, impact: 0 });
      expect(narratedStarSequence(start + 4).phase).toBe('assembled');
    }
  });

  it('reprend le cycle en position assemblée après le dernier départ', () => {
    expect(lionSequence(LION_STORY_SECONDS)).toEqual({ beat: null, impact: 0 });
    expect(narratedStarSequence(LION_STORY_SECONDS)).toMatchObject({
      phase: 'assembled',
      expansion: 0,
    });
    expect(narratedStarSequence(LION_STORY_SECONDS + 14).phase).toBe('fading');
    expect(narratedStarSequence(LION_STORY_SECONDS + 19).phase).toBe('separated');
  });
});
