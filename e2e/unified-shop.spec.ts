import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Publications synthétiques interceptées dans le navigateur, jamais insérées dans Neon.
const product = {
  id: 'publication-recette',
  slug: 'publication-recette',
  name: 'Produit de recette publié',
  description: 'Donnée synthétique réservée au contrôle de la boutique unique.',
  category: 'accessoires',
  priceXof: 12000,
  sizes: [],
  colors: [],
  availability: 'on_request',
  status: 'published',
  media: [
    {
      id: 'photo-recette',
      type: 'image',
      url: 'https://res.cloudinary.com/recette/image/upload/produit.webp',
      alt: 'Photo de la publication de recette',
      position: 0,
    },
  ],
  createdAt: '2026-10-20T00:00:00Z',
  updatedAt: '2026-10-20T00:00:00Z',
};
const catalogue = (items = [product]) => ({ items, total: items.length, page: 1, pageSize: 24 });
async function images(page: Page) {
  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({
      path: 'public/images/tote.webp',
      contentType: 'image/webp',
    }),
  );
}

test('collections : même boutique, une recherche et catégories conservées', async ({
  page,
  isMobile,
}) => {
  await images(page);
  await page.route('**/api/catalogue?*', (route) => route.fulfill({ json: catalogue() }));
  await page.goto('/collections?category=accessoires&q=recette');
  await expect(page).toHaveURL(/\/boutique\?category=accessoires&q=recette$/);
  await expect(page.getByTestId('catalogue-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Rechercher', exact: true })).toHaveCount(1);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.locator('.product-card')).toHaveCount(0);
  if (isMobile) {
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    const mobile = page.getByRole('navigation', { name: 'Navigation mobile' });
    await expect(mobile.getByRole('link', { name: 'La boutique', exact: true })).toHaveCount(1);
    await mobile.getByRole('link', { name: 'Sénégal', exact: true }).click();
    await expect(page).toHaveURL(/\/boutique\?category=senegal$/);
  } else {
    const trigger = page.getByRole('button', { name: 'Les collections', exact: true });
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    const menu = page.getByRole('region', { name: 'Collections de la boutique' });
    await expect(menu.getByRole('link', { name: 'Tous les produits' })).toBeFocused();
    await expect(menu.getByTestId('collections-menu-product')).toHaveCount(1);
    await expect(menu.getByRole('img')).toHaveAttribute('src', product.media[0].url);
    const axe = await new AxeBuilder({ page })
      .include('#collections-menu')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.hover();
    await menu.getByRole('link', { name: 'Sénégal', exact: true }).click();
    await expect(page).toHaveURL(/\/boutique\?category=senegal$/);
    await expect(menu).toHaveCount(0);
  }
});

test('menu collections : publications récentes, retrait, panne et brouillon refusé', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Le menu de survol est remplacé par les catégories sur téléphone.');
  await images(page);
  let mode: 'published' | 'empty' | 'error' | 'draft' = 'published';
  await page.route('**/api/catalogue?*', (route) =>
    route.fulfill(
      mode === 'error'
        ? { status: 503, json: {} }
        : {
            json:
              mode === 'empty'
                ? catalogue([])
                : catalogue(
                    Array.from({ length: 4 }, (_, i) => ({
                      ...product,
                      id: `${product.id}-${i}`,
                      slug: `${product.slug}-${i}`,
                      name: `${product.name} ${i + 1}`,
                      status: mode === 'draft' ? 'draft' : 'published',
                    })),
                  ),
          },
    ),
  );
  await page.goto('/a-propos');
  const trigger = page.getByRole('button', { name: 'Les collections', exact: true });
  const menu = page.getByRole('region', { name: 'Collections de la boutique' });
  await trigger.hover();
  await expect(menu.getByTestId('collections-menu-product')).toHaveCount(3);
  await expect(menu.getByText(`${product.name} 4`, { exact: true })).toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(menu).toHaveCount(0);
  mode = 'empty';
  await trigger.hover();
  await expect(menu.getByText('Aucun produit publié pour le moment.')).toBeVisible();
  await expect(menu.getByRole('img')).toHaveCount(0);
  await page.mouse.move(0, 0);
  mode = 'error';
  await trigger.hover();
  await expect(menu.getByText('Les produits sont momentanément indisponibles.')).toBeVisible();
  mode = 'published';
  await menu.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(menu.getByTestId('collections-menu-product')).toHaveCount(3);
  await page.keyboard.press('Escape');
  mode = 'draft';
  await trigger.press('Enter');
  await expect(menu.getByText('Les produits sont momentanément indisponibles.')).toBeVisible();
  await expect(menu.getByRole('img')).toHaveCount(0);
});

test('favoris : publications vérifiées, persistance locale, prix actualisé et retrait', async ({
  page,
}) => {
  await images(page);
  let withdrawn = false;
  let price = product.priceXof;
  await page.route('**/api/catalogue?*', (route) => route.fulfill({ json: catalogue() }));
  await page.route(`**/api/catalogue/${product.slug}`, (route) =>
    route.fulfill(
      withdrawn ? { status: 404, json: {} } : { json: { ...product, priceXof: price } },
    ),
  );
  await page.goto('/boutique');
  await page
    .getByRole('button', { name: `Ajouter ${product.name} à ma sélection`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/boutique$/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ma sélection, 1 pièces' })).toBeVisible();
  price = 13000;
  await page.getByRole('button', { name: 'Ma sélection, 1 pièces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ma sélection · 1', exact: true });
  await expect(dialog.getByTestId('saved-product')).toHaveCount(1);
  await expect(dialog.getByText(/13\s000 F CFA/)).toBeVisible();
  await expect(dialog.getByRole('link', { name: new RegExp(product.name) })).toHaveAttribute(
    'href',
    `/boutique/${product.slug}`,
  );
  await page.keyboard.press('Escape');
  withdrawn = true;
  await page.getByRole('button', { name: 'Ma sélection, 1 pièces' }).click();
  await expect(page.getByRole('dialog').getByText('Votre sélection est vide.')).toBeVisible();
  await expect(page.getByTestId('saved-product')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('gainde-selection-v2') || '[]').length),
    )
    .toBe(0);
});

test('favoris : panne sans ancien produit affiché, reprise et anciennes images ignorées', async ({
  page,
}) => {
  await images(page);
  let unavailable = true;
  await page.addInitScript(({ id, slug }) => {
    localStorage.setItem('gainde-selection-v1', JSON.stringify(['senegal-vert']));
    localStorage.setItem('gainde-selection-v2', JSON.stringify([{ id, slug }]));
  }, product);
  await page.route(`**/api/catalogue/${product.slug}`, (route) =>
    route.fulfill(unavailable ? { status: 503, json: {} } : { json: product }),
  );
  await page.goto('/a-propos');
  await page.getByRole('button', { name: 'Ma sélection, 1 pièces' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ma sélection · 1', exact: true });
  await expect(dialog.getByText(/Votre sélection est momentanément inaccessible/)).toBeVisible();
  await expect(dialog.locator('img')).toHaveCount(0);
  await expect(dialog.getByTestId('saved-product')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('gainde-selection-v1'))).toBeNull();
  unavailable = false;
  await dialog.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(dialog.getByTestId('saved-product')).toHaveCount(1);
  await dialog
    .getByRole('button', { name: `Retirer ${product.name} de ma sélection`, exact: true })
    .click();
  await expect(page.getByRole('dialog').getByText('Votre sélection est vide.')).toBeVisible();
});
