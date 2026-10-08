import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('accueil, filtres, aperçu, sélection et navigation mobile', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('LA FIERTÉ');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sénégal 2', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Découvrir Le Sénégal, sur le cœur.' }).click();
  const dialog = page.getByRole('dialog', { name: 'Un regard de plus' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Voir le second visuel' }).click();
  await dialog.getByRole('button', { name: 'Garder dans ma sélection' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Ma sélection, 1 pièces' }).click();
  await expect(page.getByRole('heading', { name: 'Vos coups de cœur.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ma sélection, 1 pièces' })).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await page
      .getByRole('navigation', { name: 'Navigation mobile' })
      .getByRole('link', { name: 'Contact', exact: true })
      .click();
  } else await page.getByRole('link', { name: 'Parlons-en', exact: true }).click();
  await expect(page).toHaveURL(/contact/);
  expect(errors).toEqual([]);
});

test('recherche et états vides', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page.getByRole('textbox', { name: 'Rechercher une collection' }).fill('sénégal');
  await expect(page.locator('.search-result')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Rechercher une collection' }).fill('zzzz');
  await expect(page.getByText('Aucun résultat pour')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/collections?category=dakar');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Rechercher dans les collections' }).fill('zzzz');
  await expect(
    page.getByRole('heading', { name: 'On n’a pas encore trouvé votre match.' }),
  ).toBeVisible();
});

test('formulaire : validation, succès simulé et échec honnête', async ({ page }) => {
  await page.goto('/contact?subject=personnalisation');
  await page.getByRole('button', { name: 'Envoyer mon message' }).click();
  await expect(page.getByText('Indiquez au moins 2 caractères.')).toBeVisible();
  await page.getByLabel('Votre nom', { exact: true }).fill('Test technique');
  await page.getByLabel('Votre téléphone', { exact: true }).fill('+221770000000');
  await page.getByLabel('Votre adresse email', { exact: true }).fill('test@example.com');
  await page
    .getByLabel('Votre message', { exact: true })
    .fill('Ceci est un test technique automatisé.');
  await page.locator('#consent').check();
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Votre message n’a pas été enregistré.' }),
    }),
  );
  await page.getByRole('button', { name: 'Envoyer mon message' }).click();
  await expect(page.locator('.form-error-message')).toContainText('n’a pas été enregistré');
  await expect(page.locator('#message')).toHaveValue('Ceci est un test technique automatisé.');
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ reference: '11111111-1111-4111-8111-111111111111' }),
    }),
  );
  await page.getByRole('button', { name: 'Envoyer mon message' }).click();
  await expect(page.getByRole('heading', { name: 'Le premier pas est fait.' })).toBeVisible();
  await expect(page.getByText('Aucun email de confirmation automatique')).toBeVisible();
});

test('accessibilité WCAG : accueil, contact, collections et dialogue', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/contact', '/collections', '/a-propos']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations,
      `${path} : ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
});

test('PWA : manifeste, repli sans connexion et aucune API mise en cache', async ({
  page,
  context,
}) => {
  await page.goto('/');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toHaveLength(3);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'Le réseau fait une pause.' })).toBeVisible();
  const urls = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (name) => (await (await caches.open(name)).keys()).map((r) => r.url)),
      )
    ).flat();
  });
  expect(urls.some((u) => u.includes('/api/') || u.endsWith('/contact'))).toBe(false);
  await context.setOffline(false);
});

test('404 et affichage réduit sans débordement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/page-inexistante');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('On a perdu');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `débordement à ${width}px`,
    ).toBe(true);
  }
});
