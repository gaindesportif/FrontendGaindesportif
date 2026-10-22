import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

// Données de recette synthétiques : aucun produit ni tarif ajouté au vrai catalogue.
const product = {
  id: 'test-product-ref',
  slug: 'produit-test',
  name: 'Maillot de recette technique',
  description: 'Produit synthétique pour la recette locale.\nAucune annonce commerciale réelle.',
  category: 'maillots',
  stockQuantity: 100,
  priceXof: 10000,
  sizes: ['M', 'L'],
  colors: ['Vert', 'Blanc'],
  availability: 'on_request',
  status: 'published',
  media: [
    {
      id: 'test-image',
      type: 'image',
      url: 'https://res.cloudinary.com/gainde-test/image/upload/recette.webp',
      alt: 'Photo de recette technique',
      position: 0,
    },
    {
      id: 'test-detail',
      type: 'image',
      url: 'https://res.cloudinary.com/gainde-test/image/upload/detail.webp',
      alt: 'Détail de recette technique',
      position: 1,
    },
  ],
  createdAt: '2026-10-19T00:00:00.000Z',
  updatedAt: '2026-10-19T00:00:00.000Z',
};

async function mockImages(page: Page) {
  await page.route('https://res.cloudinary.com/**/image/upload/**', (route) =>
    route.fulfill({ path: 'public/images/senegal-vert.webp', contentType: 'image/webp' }),
  );
}

test('boutique : liste réelle simulée, filtres envoyés au serveur et pagination', async ({
  page,
}) => {
  await mockImages(page);
  const queries: URLSearchParams[] = [];
  await page.route('**/api/catalogue?*', (route) => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    return route.fulfill({
      json: { items: [product], total: 25, page: Number(query.get('page')), pageSize: 24 },
    });
  });
  await page.goto('/boutique');
  await expect(page.getByTestId('catalogue-card')).toHaveCount(1);
  await expect(page.getByText(/10\s000 F CFA/)).toBeVisible();
  const image = page.getByRole('img', { name: 'Photo de recette technique' });
  await expect(image).toHaveAttribute('src', product.media[0].url);
  expect(await image.getAttribute('src')).not.toContain('/_next/image');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'Rechercher un produit', exact: true });
  await search.getByRole('searchbox', { name: 'Rechercher un produit' }).fill('maillot');
  await search.getByRole('button', { name: 'Voir tous les résultats', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Effacer la recherche maillot', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('group', { name: 'Catégories de la boutique' })
    .getByRole('button', { name: 'Maillots', exact: true })
    .click();
  await expect.poll(() => queries.at(-1)?.get('q')).toBe('maillot');
  await expect.poll(() => queries.at(-1)?.get('category')).toBe('maillots');
  await expect(page.getByRole('button', { name: 'Suivant', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.getByText('Page 2 sur 2')).toBeVisible();
  expect(queries.at(-1)?.get('page')).toBe('2');
  await page.getByRole('link', { name: `Voir ${product.name}`, exact: true }).click();
  await expect(page).toHaveURL(/boutique\/produit-test$/);
});

test('boutique : panne, reprise et catalogue vide distincts', async ({ page }) => {
  let available = false;
  await page.route('**/api/catalogue?*', (route) =>
    route.fulfill(
      available
        ? { json: { items: [], total: 0, page: 1, pageSize: 24 } }
        : { status: 503, json: { message: 'Panne simulée' } },
    ),
  );
  await page.goto('/boutique');
  await expect(page.getByRole('heading', { name: 'La boutique fait une pause.' })).toBeVisible();
  await expect(page.getByTestId('catalogue-card')).toHaveCount(0);
  available = true;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Les premières pièces arrivent ici.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'La boutique fait une pause.' }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'Rechercher un produit', exact: true });
  await search.getByRole('searchbox', { name: 'Rechercher un produit' }).fill('introuvable');
  await search.getByRole('button', { name: 'Voir tous les résultats', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Aucun produit pour cette recherche.' }),
  ).toBeVisible();
});

test('fiche : galerie photo au clavier et demande WhatsApp avec image', async ({ page }) => {
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) => route.fulfill({ json: product }));
  await page.goto('/boutique/produit-test');
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await expect(page.getByText('100 articles en stock au total')).toBeVisible();
  const detail = page.getByRole('button', {
    name: 'Voir la photo 2 : Détail de recette technique',
    exact: true,
  });
  await detail.focus();
  await page.keyboard.press('Enter');
  await expect(detail).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('video')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Voir la photo 1 : Photo de recette technique', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Commander sur WhatsApp', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Taille souhaitée', { exact: true }).selectOption('L');
  await page.getByLabel('Couleur souhaitée', { exact: true }).selectOption('Vert');
  await page.getByRole('button', { name: 'Augmenter la quantité' }).click();
  const request = page.getByTestId('product-whatsapp');
  await expect(request).toBeVisible();
  const url = new URL((await request.getAttribute('href'))!);
  expect(url.origin + url.pathname).toBe('https://wa.me/221775135353');
  const message = url.searchParams.get('text');
  expect(message).toContain(`Produit : ${product.name}`);
  expect(message).toContain('Référence : test-product-ref');
  expect(message).toContain('Quantité souhaitée : 2');
  expect(message).toContain('Taille : L');
  expect(message).toContain('Couleur : Vert');
  expect(message).toContain('/boutique/produit-test');
  expect(message).toContain(`Photo du produit : ${product.media[0].url}`);
  await page.getByLabel('Quantité souhaitée', { exact: true }).fill('0');
  await expect(page.getByTestId('product-whatsapp')).toHaveCount(0);
  await expect(page.getByText('Choisissez une quantité entière de 1 à 99.')).toBeVisible();
});

test('fiche : disponibilité, retrait et panne gardent des comportements distincts', async ({
  page,
}) => {
  await mockImages(page);
  let status: 'unavailable' | 'missing' | 'error' = 'unavailable';
  await page.route('**/api/catalogue/produit-test', (route) =>
    route.fulfill(
      status === 'unavailable'
        ? { json: { ...product, availability: 'unavailable' } }
        : { status: status === 'missing' ? 404 : 503, json: { message: 'État simulé' } },
    ),
  );
  await page.goto('/boutique/produit-test');
  await expect(
    page.getByText(
      'Ce produit ne peut pas faire l’objet d’une demande de commande pour le moment.',
    ),
  ).toBeVisible();
  await expect(page.getByTestId('product-whatsapp')).toHaveCount(0);
  status = 'missing';
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ce produit n’est plus proposé.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réessayer', exact: true })).toHaveCount(0);
  status = 'error';
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Le produit est momentanément inaccessible.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réessayer', exact: true })).toBeVisible();
});

test('boutique et fiche : accessibilité et absence de débordement', async ({ page }) => {
  await mockImages(page);
  await page.route('**/api/catalogue?*', (route) =>
    route.fulfill({ json: { items: [product], total: 1, page: 1, pageSize: 24 } }),
  );
  await page.route('**/api/catalogue/produit-test', (route) => route.fulfill({ json: product }));
  for (const path of ['/boutique', '/boutique/produit-test']) {
    await page.goto(path);
    await expect(page.getByText(/10\s000 F CFA/).first()).toBeVisible();
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      accessibility.violations,
      `${path}: ${JSON.stringify(accessibility.violations.map((item) => item.id))}`,
    ).toEqual([]);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${path} à ${width}px`,
      ).toBe(true);
    }
  }
});

test('accueil : publications du catalogue, catégories, fiche et retrait', async ({ page }) => {
  await mockImages(page);
  let withdrawn = false;
  const queries: URLSearchParams[] = [];
  await page.route('**/api/catalogue?*', (route) => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    const items = withdrawn
      ? []
      : query.get('category')
        ? [product]
        : Array.from({ length: 5 }, (_, index) => ({
            ...product,
            id: `recette-${index}`,
            slug: `recette-${index}`,
            name: `Publication de recette ${index + 1}`,
          }));
    return route.fulfill({ json: { items, total: items.length, page: 1, pageSize: 24 } });
  });
  await page.route('**/api/catalogue/produit-test', (route) => route.fulfill({ json: product }));
  await page.goto('/');
  const selection = page.locator('#collections');
  await expect(selection.getByTestId('catalogue-card')).toHaveCount(4);
  await expect(selection.getByText('Publication de recette 5', { exact: true })).toHaveCount(0);
  await selection.getByRole('button', { name: 'Maillots', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(selection.getByTestId('catalogue-card')).toHaveCount(1);
  expect(queries.at(-1)?.get('category')).toBe('maillots');
  await expect(selection.getByRole('img', { name: 'Photo de recette technique' })).toHaveAttribute(
    'src',
    product.media[0].url,
  );
  await expect(selection.getByText(/10\s000 F CFA/)).toBeVisible();
  await selection.getByRole('link', { name: `Voir ${product.name}`, exact: true }).click();
  await expect(page).toHaveURL(/boutique\/produit-test$/);
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  withdrawn = true;
  await page.goto('/');
  await expect(
    selection.getByRole('heading', { name: 'Les premières pièces arrivent ici.' }),
  ).toBeVisible();
  await expect(selection.getByTestId('catalogue-card')).toHaveCount(0);
  await expect(selection.locator('.product-card')).toHaveCount(0);
});

test('accueil : erreur, reprise, données refusées et accessibilité de la sélection', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockImages(page);
  let mode: 'error' | 'ready' | 'draft' = 'error';
  await page.route('**/api/catalogue?*', (route) =>
    route.fulfill(
      mode === 'error'
        ? { status: 503, json: { message: 'Panne de recette' } }
        : {
            json: {
              items: [{ ...product, status: mode === 'draft' ? 'draft' : 'published' }],
              total: 1,
              page: 1,
              pageSize: 24,
            },
          },
    ),
  );
  await page.goto('/');
  const selection = page.locator('#collections');
  await expect(
    selection.getByRole('heading', { name: 'Les produits font une pause.' }),
  ).toBeVisible();
  await expect(selection.getByTestId('catalogue-card')).toHaveCount(0);
  mode = 'ready';
  await selection.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(selection.getByTestId('catalogue-card')).toHaveCount(1);
  const accessibility = await new AxeBuilder({ page })
    .include('#collections')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `accueil à ${width}px`,
    ).toBe(true);
  }
  mode = 'draft';
  await page.reload();
  await expect(
    selection.getByRole('heading', { name: 'Les produits font une pause.' }),
  ).toBeVisible();
  await expect(selection.getByTestId('catalogue-card')).toHaveCount(0);
});

test('fiche : stock affiché, quantité bornée et rupture sans demande WhatsApp', async ({
  page,
}) => {
  await mockImages(page);
  let stockQuantity = 2;
  await page.route('**/api/catalogue/produit-test', (route) =>
    route.fulfill({
      json: {
        ...product,
        stockQuantity,
        availability: stockQuantity ? 'available' : 'unavailable',
      },
    }),
  );
  await page.goto('/boutique/produit-test');
  await expect(page.getByText('2 articles en stock au total', { exact: true })).toBeVisible();
  await page.getByLabel('Taille souhaitée', { exact: true }).selectOption('L');
  await page.getByLabel('Couleur souhaitée', { exact: true }).selectOption('Vert');
  await page.getByRole('button', { name: 'Augmenter la quantité', exact: true }).click();
  await expect(page.getByLabel('Quantité souhaitée', { exact: true })).toHaveValue('2');
  await expect(
    page.getByRole('button', { name: 'Augmenter la quantité', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Quantité souhaitée', { exact: true }).fill('3');
  await expect(page.getByTestId('product-whatsapp')).toHaveCount(0);
  await expect(
    page.getByText('Choisissez une quantité entière de 1 à 2.', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Quantité souhaitée', { exact: true }).fill('2');
  await expect(page.getByTestId('product-whatsapp')).toBeVisible();
  stockQuantity = 0;
  await page.reload();
  await expect(page.getByText('Rupture de stock', { exact: true })).toBeVisible();
  await expect(page.getByTestId('product-whatsapp')).toHaveCount(0);
  await expect(page.getByLabel('Quantité souhaitée', { exact: true })).toHaveCount(0);
});
