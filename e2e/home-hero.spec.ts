import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test('accueil cinéma : ambiances, détails, liens et pause', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByTestId('cinematic-hero');
  await expect(hero).toHaveAttribute('data-chapter', 'terrain');
  await hero.getByRole('button', { name: '02 La ville', exact: true }).click();
  await expect(hero).toHaveAttribute('data-chapter', 'ville');
  await hero.getByRole('button', { name: '03 L’identité', exact: true }).click();
  await expect(page.getByTestId('pillar-star-stage')).toHaveAttribute('data-palette', 'identite');
  await expect(hero.getByRole('button', { name: 'Déployer les cinq branches' })).toHaveCount(0);
  await hero.getByRole('button', { name: 'Mettre les animations en pause', exact: true }).click();
  await expect(hero).toHaveAttribute('data-motion', 'paused');
  await hero.getByRole('button', { name: 'Reprendre les animations', exact: true }).click();
  await expect(hero).toHaveAttribute('data-motion', 'playing');
  await hero.getByRole('link', { name: 'Découvrir la boutique', exact: true }).click();
  await expect(page).toHaveURL(/\/boutique$/);
});

test('mouvement réduit : composition statique, clavier et accessibilité', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('pillar-star-canvas')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Animations réduites selon votre préférence' }),
  ).toBeDisabled();
  const ville = page.getByRole('button', { name: '02 La ville', exact: true });
  await ville.focus();
  await page.keyboard.press('Enter');
  await expect(ville).toHaveAttribute('aria-pressed', 'true');
  const result = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('cinéma mobile : cibles tactiles et aucune largeur débordante', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      String(width),
    ).toBe(true);
  }
  const button = await page
    .getByRole('button', { name: 'Faire tourner l’étoile', exact: true })
    .boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(40);
});

test('sans JavaScript : illustration éditoriale, titre et liens restent disponibles', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'LA FIERTÉ SE PORTE.' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Découvrir la boutique', exact: true }),
  ).toHaveAttribute('href', '/boutique');
  await expect(page.getByTestId('pillar-star-stage').locator('svg')).toBeVisible();
  await context.close();
});

test('la vision des cinq piliers reste lisible et honnête', async ({ page }) => {
  await page.goto('/');
  const list = page.getByRole('list', { name: 'Les cinq piliers de Gainde Sportif' });
  for (const label of ['TECH', 'INFRA', 'EVENT', 'MEDIA', 'KIDS'])
    await expect(list).toContainText(label);
  const summary = page.getByText('Une boutique au cœur de cinq piliers', { exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText(
      'Les cinq piliers présentent notre vision. Leurs services se construiront progressivement.',
      { exact: true },
    ),
  ).toBeVisible();
});

test('étoile : cinq piliers sélectionnables au clavier et animation de gauche suspendue', async ({
  page,
}) => {
  await page.goto('/');
  const constellation = page.getByRole('group', { name: 'Explorer les cinq piliers', exact: true });
  await page.getByTestId('pillar-star-stage').scrollIntoViewIfNeeded();
  await expect(constellation.getByRole('button')).toHaveCount(5, { timeout: 15000 });
  for (const label of ['TECH', 'INFRA', 'EVENT', 'MEDIA', 'KIDS']) {
    const button = constellation.getByRole('button', { name: `GAINDE ${label}`, exact: false });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.locator('#hero-pillar-story')).toContainText('Le sport pour grandir');
  await page.getByRole('button', { name: 'Mettre les animations en pause', exact: true }).click();
  const copyAnimations = await page
    .getByTestId('hero-animated-copy')
    .evaluate((el) => el.getAnimations({ subtree: true }).map((animation) => animation.playState));
  expect(copyAnimations.length).toBeGreaterThan(3);
  expect(copyAnimations.every((state) => state === 'paused' || state === 'finished')).toBe(true);
  await constellation.getByRole('button', { name: 'GAINDE TECH', exact: false }).click();
  await expect(page.locator('#hero-pillar-story > span')).toHaveText('Le sport connecté');
  await expect(page.locator('#hero-pillar-story > span')).toHaveCSS('opacity', '1');
});
