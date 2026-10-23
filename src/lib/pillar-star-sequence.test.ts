import { describe, it, expect } from 'vitest';
import { starSequence, STAR_CYCLE_SECONDS } from './pillar-star-sequence';
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
