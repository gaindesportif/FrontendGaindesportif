import { describe, expect, it } from 'vitest';
import { safeCustomerReturn } from './customer-client';
describe('Retour après connexion client', () => {
  it('garde une fiche ou boutique interne et ses options', () => {
    expect(safeCustomerReturn('/boutique/article?favorite=123')).toBe(
      '/boutique/article?favorite=123',
    );
    expect(safeCustomerReturn('/compte')).toBe('/compte');
  });
  it('refuse URLs externes, antislashs, contrôles et boucles de connexion', () => {
    for (const value of [
      null,
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/boutique/\nabc',
      '/compte/connexion',
      '/compte/inscription',
      '/administration',
      '/boutiqueevil',
      '/%2f%2fevil.example',
    ])
      expect(safeCustomerReturn(value)).toBe('/compte');
  });
});
