import { describe, it, expect } from 'vitest';
import { filterCollections, isCategory } from './collections';
import { contactSchema } from './contact';
describe('sélection éditoriale', () => {
  it('filtre les catégories sans inventer de prix', () => {
    expect(filterCollections('senegal')).toHaveLength(2);
    expect(filterCollections('all', 'sénégal')).toHaveLength(2);
    expect(filterCollections('all', 'inexistant')).toEqual([]);
    expect(filterCollections()[0]).not.toHaveProperty('price');
  });
  it('refuse les catégories inconnues', () => {
    expect(isCategory('admin')).toBe(false);
    expect(isCategory('all')).toBe(true);
  });
});
describe('contact', () => {
  const valid = {
    name: 'Équipe test',
    email: 'test@example.com',
    phone: '+221770000000',
    subject: 'autre',
    message: 'Une demande de test.',
    consent: true,
    website: '',
  };
  it('accepte une demande complète', () =>
    expect(contactSchema.safeParse(valid).success).toBe(true));
  it('rejette honeypot, absence de consentement, mail et téléphone invalides', () => {
    for (const extra of [
      { website: 'spam' },
      { consent: false },
      { email: 'bad' },
      { phone: 'abcdefgh' },
      { role: 'admin' },
    ])
      expect(contactSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
  });
});
