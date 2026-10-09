import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('scène 3D : univers, liens réels, pause et interactions', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const scene = page.getByTestId('hero-scene');
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  await page.getByRole('button', { name: 'Voir l’univers Sénégal' }).click();
  await expect(scene).toHaveAttribute('data-universe', 'senegal');
  await expect(
    scene.getByRole('img', {
      name: 'Ensemble sportif vert aux couleurs et à l’emblème du Sénégal',
    }),
  ).toBeVisible();
  await expect(
    scene.getByRole('link', { name: 'Découvrir la collection Sénégal' }),
  ).toHaveAttribute('href', '/collections?category=senegal');
  await page.getByRole('button', { name: 'Voir l’univers Accessoires' }).click();
  await expect(scene).toHaveAttribute('data-universe', 'accessoires');
  const pause = scene.getByRole('button', {
    name: 'Mettre les animations et le défilement en pause',
  });
  await pause.click();
  await expect(scene).toHaveAttribute('data-motion', 'paused');
  expect(
    await scene.evaluate((element) =>
      [...element.querySelectorAll('*')].every(
        (child) => getComputedStyle(child).animationPlayState === 'paused',
      ),
    ),
  ).toBe(true);
  await scene.getByRole('button', { name: 'Reprendre les animations et le défilement' }).click();
  await expect(scene).toHaveAttribute('data-motion', 'playing');
  if (!isMobile) {
    // Déplacer réellement la souris pour transmettre l'inclinaison à la scène.
    const viewport = await page.getByTestId('hero-viewport').boundingBox();
    expect(viewport).not.toBeNull();
    await page.mouse.move(
      viewport!.x + viewport!.width * 0.25,
      viewport!.y + viewport!.height * 0.3,
    );
    await expect
      .poll(() =>
        scene.evaluate((element) => {
          const tilt = element.style.getPropertyValue('--tilt-y');
          return tilt.endsWith('deg') && tilt !== '0deg';
        }),
      )
      .toBe(true);
  }
  await scene.getByRole('link', { name: 'Découvrir la collection Accessoires' }).click();
  await expect(page).toHaveURL(/collections\?category=accessoires/);
  expect(errors).toEqual([]);
});

test('scène : gestes tactiles, navigation clavier et pause hors écran', async ({ page }) => {
  await page.goto('/');
  const scene = page.getByTestId('hero-scene');
  const viewport = page.getByTestId('hero-viewport');
  await expect(page.getByTestId('home-hero')).toHaveAttribute('data-enhanced', 'true');
  // Isoler les gestes de la minuterie : le chargement GPU peut durer plus de 6 s.
  // Le focus du bouton suspend l'autoplay, couvert séparément avec son horloge.
  await scene.getByRole('button', { name: 'Voir l’univers Dakar' }).click();
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  await viewport.scrollIntoViewIfNeeded();
  await viewport.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 220, clientY: 100 });
  await viewport.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 100, clientY: 105 });
  await expect(scene).toHaveAttribute('data-universe', 'senegal');
  await viewport.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 100, clientY: 100 });
  await viewport.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 110, clientY: 220 });
  await expect(scene).toHaveAttribute('data-universe', 'senegal');
  const dakar = scene.getByRole('button', { name: 'Voir l’univers Dakar' });
  await dakar.focus();
  await page.keyboard.press('Enter');
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(scene).toHaveAttribute('data-visible', 'false');
  await viewport.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-visible', 'true');
});

test('préférence de mouvement réduit : scène statique et contenu accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const scene = page.getByTestId('hero-scene');
  await expect(scene).toHaveAttribute('data-motion', 'paused');
  await expect(
    scene.getByRole('button', { name: 'Animations réduites selon votre préférence' }),
  ).toBeDisabled();
  await scene.getByRole('button', { name: 'Voir l’univers Sénégal' }).click();
  await expect(scene).toHaveAttribute('data-universe', 'senegal');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('débordements et cible tactile sur petits écrans', async ({ page }) => {
  // Mesurer sept mises en page, sans rendre sept scènes GPU en parallèle.
  // Le canvas animé et ses débordements sont vérifiés dans glass-scene.spec.ts.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `largeur ${width}`,
    ).toBe(true);
    const controls = page
      .getByRole('group', { name: 'Choisir l’univers de la scène 3D' })
      .getByRole('button');
    for (const button of await controls.all())
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test('sans JavaScript : titre, emblème et liens restent disponibles', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3100/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('LA FIERTÉ');
  await expect(page.getByTestId('hero-emblem')).toBeVisible();
  await expect(page.getByTestId('hero-scene').locator('figure')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Découvrir les collections', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Découvrir la collection Dakar' })).toHaveAttribute(
    'href',
    '/collections?category=dakar',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
