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
  flockingPriceXof: 2000,
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

test('fiche : la vague verte de sélection fonctionne au survol et au clavier', async ({
  page,
}, testInfo) => {
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) => route.fulfill({ json: product }));
  await page.goto('/boutique/produit-test');
  const favorite = page.getByRole('button', { name: `Ajouter ${product.name} à ma sélection` });
  await expect(favorite).toBeEnabled();
  const wave = () => favorite.evaluate((node) => getComputedStyle(node, '::after').transform);
  const resting = await wave();
  expect(resting).not.toBe('none');
  if (testInfo.project.name === 'desktop') {
    await favorite.hover();
  } else {
    await page.keyboard.press('Tab');
    await favorite.focus();
  }
  await expect.poll(wave).not.toBe(resting);
  await expect(favorite).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => favorite.evaluate((node) => getComputedStyle(node, '::after').transitionDuration))
    .toBe('0s');
});

test('fiche maillot : flocage modifiable dans WhatsApp et modèle standard à 360°', async ({
  page,
}) => {
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) => route.fulfill({ json: product }));
  await page.goto('/boutique/produit-test');
  const withFlocking = page.getByRole('radio', { name: 'Avec flocage' });
  const noFlocking = page.getByRole('radio', { name: 'Sans flocage' });
  await expect(noFlocking).toBeChecked();
  await noFlocking.focus();
  await page.keyboard.press('ArrowRight');
  await expect(withFlocking).toBeChecked();
  const preview = page.getByRole('button', { name: 'Aperçu 3D à 360°' });
  await expect(preview).toBeDisabled();
  await page.getByLabel('Taille souhaitée').selectOption('L');
  await page.getByLabel('Couleur souhaitée').selectOption('Vert');
  const request = page.getByTestId('product-whatsapp');
  const name = page.getByLabel('Nom à floquer');
  const number = page.getByLabel('Numéro à floquer');
  await name.fill('Ndiaye');
  await number.fill('AB');
  await expect(number).toHaveAttribute('aria-invalid', 'true');
  await expect(request).toHaveCount(0);
  await number.fill('07');
  const readMessage = async () =>
    new URL((await request.getAttribute('href'))!).searchParams.get('text');
  expect(await readMessage()).toContain('Nom à floquer : Ndiaye');
  expect(await readMessage()).toContain('Numéro à floquer : 07');
  expect(await readMessage()).toMatch(/Sous-total produits : 12\s000 F CFA/);
  await expect(page.getByText(/Sous-total produits/)).toHaveText(
    /Sous-total produits : 12\s000 F CFA/,
  );
  await preview.focus();
  await expect(preview).toHaveCSS('background-size', '100% 100%');
  await expect(preview).toHaveCSS('color', 'rgb(255, 255, 255)');
  await preview.click();
  await expect(page.getByText(/Maillot standard pour visualiser le flocage/)).toBeVisible();
  const rotation = page.getByRole('slider', { name: 'Faire pivoter le maillot' });
  await expect(rotation).toHaveValue('180');
  const canvas = page.locator('#jersey-preview canvas');
  const back = await canvas.screenshot();
  await rotation.focus();
  await page.keyboard.press('Home');
  await expect(rotation).toHaveValue('0');
  expect(await canvas.screenshot()).not.toEqual(back);
  await page.keyboard.press('End');
  await expect(rotation).toHaveValue('360');

  await name.fill('Aïssatou');
  await number.fill('21');
  expect(await readMessage()).toContain('Nom à floquer : Aïssatou');
  expect(await readMessage()).toContain('Numéro à floquer : 21');
  await noFlocking.check();
  await expect(name).toHaveCount(0);
  expect(await readMessage()).toContain('Flocage : Sans flocage');
  expect(await readMessage()).toMatch(/Sous-total produits : 10\s000 F CFA/);
  expect(await readMessage()).not.toContain('Aïssatou');
  await withFlocking.check();
  await expect(name).toHaveValue('Aïssatou');
  await expect(number).toHaveValue('21');
});

test('fiche maillot : un libellé sans teinte exige une couleur enregistrée par l’admin', async ({
  page,
}) => {
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) =>
    route.fulfill({ json: { ...product, colors: ['Originale'] } }),
  );
  await page.goto('/boutique/produit-test');
  await page.getByRole('radio', { name: 'Avec flocage' }).check();
  await page.getByLabel('Nom à floquer').fill('Ndiaye');
  await page.getByLabel('Numéro à floquer').fill('09');
  await expect(page.getByRole('button', { name: 'Aperçu 3D à 360°' })).toBeDisabled();
  await expect(
    page.getByText('La couleur de ce maillot reste à préciser pour activer l’aperçu 3D.'),
  ).toBeVisible();
  await expect(page.getByLabel('Couleur de démonstration')).toHaveCount(0);
});

test('fiche maillot : rotation directe, lecture et réduction de mouvement', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(45000);
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) => route.fulfill({ json: product }));
  await page.goto('/boutique/produit-test');
  await page.getByRole('radio', { name: 'Avec flocage' }).check();
  await page.getByLabel('Couleur souhaitée').selectOption('Vert');
  await page.getByLabel('Nom à floquer').fill('Ndiaye');
  await page.getByLabel('Numéro à floquer').fill('07');
  await page.getByRole('button', { name: 'Aperçu 3D à 360°' }).click();

  const canvas = page.locator('#jersey-preview canvas');
  const rotation = page.getByRole('slider', { name: 'Faire pivoter le maillot' });
  const play = page.getByRole('button', { name: 'Lancer une rotation à 360°', exact: true });
  const stop = page.getByRole('button', { name: 'Arrêter la rotation', exact: true });
  await expect(rotation).toHaveValue('180', { timeout: 12000 });
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  const start = { x: bounds.x + bounds.width * 0.31, y: bounds.y + bounds.height * 0.5 };
  const travel = bounds.width * 0.28;
  if (isMobile) {
    const touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (const fraction of [0.25, 0.5, 0.75, 1]) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x + travel * fraction, y: start.y }],
      });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + travel, start.y, { steps: 4 });
    await page.mouse.up();
  }
  await expect.poll(async () => Number(await rotation.inputValue())).toBeGreaterThan(180);

  const beforePlayback = await rotation.inputValue();
  await play.click();
  await expect(stop).toBeVisible();
  await expect(rotation).not.toHaveValue(beforePlayback);
  await stop.click();
  await expect(play).toBeVisible();
  await play.click();
  await expect(stop).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(play).toHaveCount(0);
  await expect(stop).toHaveCount(0);
  await rotation.press('Home');
  await expect(rotation).toHaveValue('0');
  await rotation.press('ArrowRight');
  await expect(rotation).toHaveValue('1');
  await rotation.press('End');
  await expect(rotation).toHaveValue('360');
});

test('fiche maillot : le flocage reste visible quand la couleur du produit change', async ({
  page,
}) => {
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) =>
    route.fulfill({
      json: { ...product, colors: ['BLEU-MARINE', 'Blanc', 'Originale'], previewColor: 'Rouge' },
    }),
  );
  await page.goto('/boutique/produit-test');
  await page.getByRole('radio', { name: 'Avec flocage' }).check();
  await page.getByLabel('Nom à floquer').fill('Ndiaye');
  await page.getByLabel('Numéro à floquer').fill('07');
  await page.getByLabel('Taille souhaitée').selectOption('L');
  const productColor = page.getByLabel('Couleur souhaitée');
  await productColor.selectOption('BLEU-MARINE');
  await page.getByRole('button', { name: 'Aperçu 3D à 360°' }).click();
  await expect(page.getByText(/Maillot standard pour visualiser le flocage/)).toBeVisible();
  const canvas = page.locator('#jersey-preview canvas');
  const angle = page.getByRole('slider', { name: 'Faire pivoter le maillot' });
  await expect(angle).toHaveValue('180');
  const before = await canvas.screenshot();
  await expect(page.getByLabel('Couleur de démonstration')).toHaveCount(0);
  await productColor.selectOption('Blanc');
  await expect(angle).toHaveValue('180');
  const white = await canvas.screenshot();
  expect(white).not.toEqual(before);
  await page.getByLabel('Nom à floquer').fill('Aïssatou');
  const renamed = await canvas.screenshot();
  expect(renamed).not.toEqual(white);
  await page.getByLabel('Numéro à floquer').fill('21');
  expect(await canvas.screenshot()).not.toEqual(renamed);
  await productColor.selectOption('Originale');
  await expect(page.getByLabel('Couleur de démonstration')).toHaveCount(0);
  await expect(angle).toHaveValue('180');
  expect(await canvas.screenshot()).not.toEqual(white);
  await expect(productColor).toHaveValue('Originale');
  await expect(page.getByLabel('Nom à floquer')).toHaveValue('Aïssatou');
  const url = new URL((await page.getByTestId('product-whatsapp').getAttribute('href'))!);
  expect(url.searchParams.get('text')).toContain('Couleur : Originale');
  expect(url.searchParams.get('text')).not.toContain('Couleur : Rouge');
});

test('fiche maillot : aperçu à plat quand WebGL est indisponible', async ({ page }) => {
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) => route.fulfill({ json: product }));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      return type === 'webgl2' ? null : Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/boutique/produit-test');
  await page.getByRole('radio', { name: 'Avec flocage' }).check();
  await page.getByLabel('Couleur souhaitée').selectOption('Vert');
  await page.getByLabel('Nom à floquer').fill('Ndiaye');
  await page.getByLabel('Numéro à floquer').fill('07');
  await page.getByRole('button', { name: 'Aperçu 3D à 360°' }).click();
  const flat = page.getByRole('group', { name: 'Vue à plat du flocage' });
  await expect(flat).toContainText('Ndiaye');
  await expect(flat).toContainText('07');
  await page.getByLabel('Numéro à floquer').fill('21');
  await expect(flat).toContainText('21');
});

test('fiche : le flocage est réservé aux maillots', async ({ page }) => {
  await mockImages(page);
  await page.route('**/api/catalogue/produit-test', (route) =>
    route.fulfill({ json: { ...product, category: 't-shirts-polos' } }),
  );
  await page.goto('/boutique/produit-test');
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Flocage' })).toHaveCount(0);
});

test('fiche : les dix photos restent consultables au clavier et sur mobile', async ({ page }) => {
  await mockImages(page);
  const media = Array.from({ length: 10 }, (_, i) => ({
    ...product.media[0],
    id: `photo-${i + 1}`,
    alt: `Vue ${i + 1}`,
    position: i,
  }));
  await page.route('**/api/catalogue/produit-test', (route) =>
    route.fulfill({ json: { ...product, media } }),
  );
  await page.goto('/boutique/produit-test');
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  const last = page.getByRole('button', { name: 'Voir la photo 10 : Vue 10', exact: true });
  await last.focus();
  await page.keyboard.press('Enter');
  await expect(last).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('main').locator('img').first()).toHaveAttribute('alt', 'Vue 10');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await page.goto('/accueil');
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
  await page.goto('/accueil');
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
  await page.goto('/accueil');
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
