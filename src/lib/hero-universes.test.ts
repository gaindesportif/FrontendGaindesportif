import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { heroUniverses } from './hero-universes';
import { categories } from './collections';

describe('univers de l’accueil', () => {
  it('renvoie vers les trois catégories existantes sans inventer de catalogue', () => {
    expect(heroUniverses.map((item) => item.id)).toEqual(['dakar', 'senegal', 'accessoires']);
    for (const item of heroUniverses)
      expect(categories.some((category) => category.id === item.id)).toBe(true);
  });
  it('utilise uniquement des images locales existantes et des alternatives lisibles', () => {
    for (const item of heroUniverses) {
      expect(existsSync(join(process.cwd(), 'public', item.image))).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', item.detail))).toBe(true);
      expect(item.alt.length).toBeGreaterThan(15);
      expect(item.description.length).toBeGreaterThan(30);
    }
  });
});
