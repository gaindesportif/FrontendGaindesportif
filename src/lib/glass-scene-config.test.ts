import { describe, expect, it } from 'vitest';
import { glassPalettes, scenePixelRatio, starOutline, transitionPose } from './glass-scene-config';
import { heroUniverses } from './hero-universes';

describe('configuration de la scène de verre', () => {
  it('emploie une silhouette fermable à cinq branches et aux rayons alternés', () => {
    const points = starOutline();
    expect(points).toHaveLength(10);
    points.forEach(({ x, y }, index) => {
      expect(Math.hypot(x, y)).toBeCloseTo(index % 2 === 0 ? 1.65 : 0.8);
    });
  });
  it('limite la résolution GPU sur mobile et ordinateur', () => {
    expect(scenePixelRatio(3, 390)).toBe(1.25);
    expect(scenePixelRatio(3, 1440)).toBe(1.5);
    expect(scenePixelRatio(1, 390)).toBe(1);
  });
  it('propose une palette pour chacun des univers réels', () => {
    expect(Object.keys(glassPalettes)).toEqual(heroUniverses.map(({ id }) => id));
  });
  it('referme le volume au milieu et retrouve sa taille après la transition', () => {
    expect(transitionPose(0).scale).toBe(1);
    expect(transitionPose(0.5).scale).toBe(0.04);
    expect(transitionPose(1).scale).toBe(1);
    expect(transitionPose(0.25).turn).toBeCloseTo(0.8);
    expect(transitionPose(0.75).turn).toBeCloseTo(-0.8);
    expect(transitionPose(2).scale).toBe(1);
  });
});
