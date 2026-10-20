import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Produits synthétiques, injectés uniquement dans les réponses du navigateur de recette.
function product(index = 1) {
  return {
    id: `search-test-${index}`,
    slug: `produit-recherche-test-${index}`,
    name: `Produit de recette technique ${index}`,
    description: 'Produit synthétique de recette locale, sans publication commerciale.',
    category: 'senegal',
    priceXof: 10000 + index,
    sizes: ['M', 'L'],
    colors: ['Vert'],
    availability: 'on_request',
    status: 'published',
    media: [
      {
        id: `search-image-${index}`,
        type: 'image',
        url: `https://res.cloudinary.com/gainde-test/image/upload/recherche-${index}.webp`,
        alt: `Photo de recette recherche ${index}`,
        position: 0,
      },
    ],
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
  };
}

function catalogue(items = [product()]) {
  return { items, total: items.length, page: 1, pageSize: 24 };
}

async function mockImages(page: Page) {
  await page.route('https://res.cloudinary.com/**/image/upload/**', (route) =>
    route.fulfill({ path: 'public/images/senegal-vert.webp', contentType: 'image/webp' }),
  );
}

function searchDialog(page: Page) {
  return page.getByRole('dialog', { name: 'Rechercher un produit', exact: true });
}

async function openSearch(page: Page) {
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  const dialog = searchDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await expect(
    dialog.getByRole('searchbox', { name: 'Rechercher un produit', exact: true }),
  ).toBeFocused();
  return dialog;
}

test('recherche : panneau droit, ouverture seule et six vrais produits au maximum', async ({
  page,
  isMobile,
}) => {
  await mockImages(page);
  const queries: URLSearchParams[] = [];
  await page.route('**/api/catalogue?*', (route) => {
    queries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({
      json: catalogue(Array.from({ length: 8 }, (_, index) => product(index + 1))),
    });
  });
  await page.goto('/a-propos');
  await page.waitForLoadState('networkidle');
  const trigger = page.getByRole('button', { name: 'Rechercher', exact: true });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  expect(queries).toHaveLength(0);

  const dialog = await openSearch(page);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(dialog.getByRole('heading', { name: 'À découvrir', exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Produits', exact: true })).toBeVisible();
  await expect(dialog.getByTestId('catalogue-card')).toHaveCount(6);
  expect(queries).toHaveLength(1);
  expect(queries[0].get('page')).toBe('1');
  expect(queries[0].get('q')).toBeNull();
  await expect(dialog.getByText(/10\s001 F CFA/)).toBeVisible();
  await expect(
    dialog.getByRole('img', { name: 'Photo de recette recherche 1', exact: true }),
  ).toHaveAttribute('src', product().media[0].url);

  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs(bounds!.x + bounds!.width - viewport!.width)).toBeLessThanOrEqual(2);
  expect(bounds!.y).toBeLessThanOrEqual(1);
  if (isMobile) {
    expect(Math.abs(bounds!.width - viewport!.width)).toBeLessThanOrEqual(2);
  } else {
    expect(bounds!.width).toBeGreaterThan(400);
    expect(bounds!.width).toBeLessThanOrEqual(Math.min(660, viewport!.width * 0.52) + 2);
  }
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  if (!isMobile) {
    await openSearch(page);
    const reopenedBounds = await dialog.boundingBox();
    await page.mouse.click(reopenedBounds!.x / 2, 120);
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});

test('recherche : clavier confiné au panneau, Échap et retour à la loupe', async ({ page }) => {
  await mockImages(page);
  await page.route('**/api/catalogue?*', (route) => route.fulfill({ json: catalogue() }));
  await page.goto('/a-propos');
  const dialog = await openSearch(page);
  await expect(dialog.getByTestId('catalogue-card')).toHaveCount(1);
  const focusable = dialog.locator('button:not([disabled]), a[href], input:not([disabled])');
  await focusable.last().focus();
  await page.keyboard.press('Tab');
  await expect(focusable.first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(focusable.last()).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Rechercher', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('recherche : une carte ouvre la fiche API et ferme le panneau', async ({ page }) => {
  await mockImages(page);
  await page.route('**/api/catalogue?*', (route) => route.fulfill({ json: catalogue() }));
  await page.route(`**/api/catalogue/${product().slug}`, (route) =>
    route.fulfill({ json: product() }),
  );
  await page.goto('/a-propos');
  const dialog = await openSearch(page);
  await dialog.getByRole('link', { name: `Voir ${product().name}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/boutique/${product().slug}$`));
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name: product().name, exact: true })).toBeVisible();
});

for (const submitWithEnter of [true, false]) {
  test(`recherche : tous les résultats via ${submitWithEnter ? 'Entrée' : 'le bouton'} conservent le mot recherché`, async ({
    page,
  }) => {
    await mockImages(page);
    const queries: URLSearchParams[] = [];
    await page.route('**/api/catalogue?*', (route) => {
      queries.push(new URL(route.request().url()).searchParams);
      return route.fulfill({ json: catalogue() });
    });
    await page.goto('/a-propos');
    const dialog = await openSearch(page);
    await expect(
      dialog.getByRole('form', { name: 'Recherche dans la boutique', exact: true }),
    ).toBeVisible();
    const field = dialog.getByRole('searchbox', { name: 'Rechercher un produit', exact: true });
    await field.fill('  maillot Sénégal  ');
    await expect.poll(() => queries.at(-1)?.get('q')).toBe('maillot Sénégal');
    expect(queries.at(-1)?.get('page')).toBe('1');
    if (submitWithEnter) await field.press('Enter');
    else await dialog.getByRole('button', { name: 'Voir tous les résultats', exact: true }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === '/boutique' && url.searchParams.get('q') === 'maillot Sénégal',
    );
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Effacer la recherche maillot Sénégal', exact: true }),
    ).toContainText('maillot Sénégal');
    await expect.poll(() => queries.at(-1)?.get('q')).toBe('maillot Sénégal');
    await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
    await expect(
      searchDialog(page).getByRole('searchbox', { name: 'Rechercher un produit', exact: true }),
    ).toHaveValue('maillot Sénégal');
  });
}

test('recherche : une suggestion ouvre la bonne catégorie de la boutique', async ({ page }) => {
  await mockImages(page);
  const queries: URLSearchParams[] = [];
  await page.route('**/api/catalogue?*', (route) => {
    queries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: catalogue() });
  });
  await page.goto('/a-propos');
  const dialog = await openSearch(page);
  const suggestion = dialog.getByRole('link', { name: 'Sénégal', exact: true });
  await expect(suggestion).toHaveAttribute('href', '/boutique?category=senegal');
  await suggestion.click();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/boutique' && url.searchParams.get('category') === 'senegal',
  );
  await expect(dialog).not.toBeVisible();
  await expect(
    page
      .getByRole('group', { name: 'Catégories de la boutique', exact: true })
      .getByRole('button', { name: 'Sénégal', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => queries.at(-1)?.get('category')).toBe('senegal');
});

test('recherche : chargement, panne, reprise et résultats vides sont distincts', async ({
  page,
}) => {
  let releaseLoading!: () => void;
  const loading = new Promise<void>((resolve) => {
    releaseLoading = resolve;
  });
  let available = false;
  await page.route('**/api/catalogue?*', async (route) => {
    await loading;
    return route.fulfill(
      available
        ? { json: catalogue([]) }
        : { status: 503, json: { message: 'Panne simulée de la recherche' } },
    );
  });
  await page.goto('/a-propos');
  const dialog = await openSearch(page);
  try {
    await expect(dialog.getByText('Recherche en cours…', { exact: true })).toBeVisible();
    await expect(dialog.getByTestId('catalogue-card')).toHaveCount(0);
  } finally {
    releaseLoading();
  }
  await expect(
    dialog.getByText('La recherche est momentanément indisponible.', { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText('Les premières pièces arrivent ici.', { exact: true }),
  ).not.toBeVisible();
  available = true;
  await dialog.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(
    dialog.getByText('Les premières pièces arrivent ici.', { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText('La recherche est momentanément indisponible.', { exact: true }),
  ).not.toBeVisible();
  await dialog
    .getByRole('searchbox', { name: 'Rechercher un produit', exact: true })
    .fill('introuvable');
  await expect(
    dialog.getByText('Aucun résultat pour « introuvable ».', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByTestId('catalogue-card')).toHaveCount(0);
});

test('recherche : la frappe rapide et une ancienne réponse ne remplacent pas les derniers résultats', async ({
  page,
}) => {
  await mockImages(page);
  const queries: string[] = [];
  let releasePrevious!: () => void;
  let previousHandled!: () => void;
  const previous = new Promise<void>((resolve) => {
    releasePrevious = resolve;
  });
  const handled = new Promise<void>((resolve) => {
    previousHandled = resolve;
  });
  await page.route('**/api/catalogue?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') || '';
    queries.push(query);
    if (query === 'ancien') {
      await previous;
      try {
        await route.fulfill({ json: catalogue([product(2)]) });
      } finally {
        previousHandled();
      }
      return;
    }
    await route.fulfill({ json: catalogue([product(query === 'nouveau' ? 3 : 1)]) });
  });
  await page.goto('/a-propos');
  const dialog = await openSearch(page);
  const field = dialog.getByRole('searchbox', { name: 'Rechercher un produit', exact: true });
  await expect(dialog.getByRole('heading', { name: product().name, exact: true })).toBeVisible();
  try {
    await field.fill('ancien');
    await expect.poll(() => queries).toContain('ancien');
    await field.fill('n');
    await field.fill('no');
    await field.fill('nouveau');
    await expect(dialog.getByRole('heading', { name: product(3).name, exact: true })).toBeVisible();
    expect(queries).not.toContain('n');
    expect(queries).not.toContain('no');
  } finally {
    releasePrevious();
  }
  await handled;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect(dialog.getByRole('heading', { name: product(3).name, exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: product(2).name, exact: true }),
  ).not.toBeVisible();
});

test('recherche : accessibilité, mouvement réduit et panneau sans débordement à 320 px', async ({
  page,
}) => {
  await mockImages(page);
  await page.route('**/api/catalogue?*', (route) =>
    route.fulfill({ json: catalogue([product(), product(2)]) }),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/a-propos');
  const dialog = await openSearch(page);
  await expect(dialog.getByTestId('catalogue-card')).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  const layout = await dialog.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    documentWidth: document.documentElement.scrollWidth,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(layout.width).toBeCloseTo(320, 0);
  expect(layout.documentWidth).toBeLessThanOrEqual(320);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
