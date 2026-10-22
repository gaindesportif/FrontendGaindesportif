import { describe, expect, it } from 'vitest';
import { productWhatsappUrl, publicProductSchema, type PublicProduct } from './catalogue';

const product: PublicProduct = {
  id: 'test-product-ref',
  slug: 'produit-test',
  name: 'Produit de test & couleurs',
  description: 'Données commerciales synthétiques réservées aux tests.',
  category: 'maillots',
  stockQuantity: 100,
  priceXof: 10000,
  sizes: ['M', 'L'],
  colors: ['Vert'],
  availability: 'on_request',
  status: 'published',
  media: [
    {
      id: 'test-image',
      type: 'image',
      url: 'https://res.cloudinary.com/demo/image/upload/test.jpg',
      alt: 'Photo de test',
      position: 0,
    },
  ],
  createdAt: '2026-10-19T00:00:00.000Z',
  updatedAt: '2026-10-19T00:00:00.000Z',
};

describe('catalogue commercial public', () => {
  it('prépare une demande encodée avec prix, variantes, quantité et lien de la fiche', () => {
    const url = new URL(
      productWhatsappUrl(
        product,
        { quantity: 2, size: 'L', color: 'Vert' },
        'https://boutique.example',
      )!,
    );
    expect(url.origin + url.pathname).toBe('https://wa.me/221775135353');
    const message = url.searchParams.get('text');
    expect(message).toContain('Produit : Produit de test & couleurs');
    expect(message).toContain('Référence : test-product-ref');
    expect(message).toMatch(/Prix unitaire affiché : 10\s000 F CFA/);
    expect(message).toContain('Quantité souhaitée : 2');
    expect(message).toContain('Taille : L');
    expect(message).toContain('Couleur : Vert');
    expect(message).toContain('https://boutique.example/boutique/produit-test');
    expect(message).toContain('Merci de confirmer la disponibilité');
  });

  it('empêche une demande invalide ou indisponible', () => {
    for (const quantity of [0, 100, 1.5, Number.NaN])
      expect(
        productWhatsappUrl(
          product,
          { quantity, size: 'M', color: 'Vert' },
          'https://boutique.example',
        ),
      ).toBeNull();
    expect(
      productWhatsappUrl(
        product,
        { quantity: 1, size: '', color: 'Vert' },
        'https://boutique.example',
      ),
    ).toBeNull();
    expect(
      productWhatsappUrl(
        { ...product, availability: 'unavailable' },
        { quantity: 1, size: 'M', color: 'Vert' },
        'https://boutique.example',
      ),
    ).toBeNull();
  });

  it('borne le WhatsApp au stock réel, accepte les catégories personnalisées et inclut la photo', () => {
    const small = {
      ...product,
      stockQuantity: 2,
      category: 'gants-de-gardien',
      categoryLabel: 'Gants de gardien',
    };
    expect(publicProductSchema.safeParse(small).success).toBe(true);
    expect(
      productWhatsappUrl(
        small,
        { quantity: 3, size: 'M', color: 'Vert' },
        'https://boutique.example',
      ),
    ).toBeNull();
    const message = new URL(
      productWhatsappUrl(
        small,
        { quantity: 2, size: 'M', color: 'Vert' },
        'https://boutique.example',
      )!,
    ).searchParams.get('text');
    expect(message).toContain(`Photo du produit : ${product.media[0].url}`);
    for (const stockQuantity of [-1, 1.5, null])
      expect(publicProductSchema.safeParse({ ...product, stockQuantity }).success).toBe(false);
    expect(
      publicProductSchema.safeParse({ ...product, media: [{ ...product.media[0], type: 'video' }] })
        .success,
    ).toBe(false);
  });

  it('refuse les brouillons, médias externes, prix absents et retire les champs internes', () => {
    expect(publicProductSchema.safeParse({ ...product, status: 'draft' }).success).toBe(false);
    expect(publicProductSchema.safeParse({ ...product, priceXof: null }).success).toBe(false);
    expect(
      publicProductSchema.safeParse({
        ...product,
        media: [{ ...product.media[0], url: 'https://external.example/photo.jpg' }],
      }).success,
    ).toBe(false);
    const parsed = publicProductSchema.parse({
      ...product,
      pendingMediaCleanup: 2,
      media: [{ ...product.media[0], publicId: 'private-internal-id' }],
    });
    expect(parsed).not.toHaveProperty('pendingMediaCleanup');
    expect(parsed.media[0]).not.toHaveProperty('publicId');
  });
});
