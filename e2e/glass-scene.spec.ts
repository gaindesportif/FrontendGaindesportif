import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    // GPU logiciel de test uniquement ; aucune option de ce type côté visiteurs.
    args: ['--enable-unsafe-swiftshader'],
  },
});

test('sans WebGL : emblème léger et univers disponibles sans collage', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        if (kind === 'webgl2') {
          document.documentElement.dataset.webglUnavailable = 'true';
          return null;
        }
        return Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  await page.goto('/');
  await page.getByTestId('hero-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-webgl-unavailable', 'true');
  const scene = page.getByTestId('hero-scene');
  await expect(scene).toHaveAttribute('data-renderer', 'static');
  await expect(scene.getByTestId('hero-emblem')).toBeVisible();
  await expect(scene.locator('figure')).toHaveCount(0);
  await expect(page.getByTestId('glass-canvas')).toHaveCount(0);
  await scene.getByRole('button', { name: 'Voir l’univers Sénégal' }).click();
  await expect(scene.getByRole('img', { name: /Ensemble sportif vert/ })).toBeVisible();
  await scene.getByRole('link', { name: 'Découvrir la collection Sénégal' }).click();
  await expect(page).toHaveURL(/category=senegal/);
});

test.describe('rendu WebGL réel', () => {
  test('actualisation avec JavaScript retardé : aucun retour du collage', async ({ page }) => {
    test.setTimeout(60000);
    let releaseScripts!: () => void;
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route('**/_next/static/chunks/**', async (route) => {
      if (route.request().resourceType() === 'script') await scriptsReady;
      await route.continue();
    });
    try {
      await page.goto('/', { waitUntil: 'commit' });
      const hero = page.getByTestId('home-hero');
      const scene = page.getByTestId('hero-scene');
      await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(scene.getByTestId('hero-emblem')).toBeVisible();
      await expect(scene).toHaveAttribute('data-renderer', 'static');
      await expect(scene.locator('figure')).toHaveCount(0);
      await expect(scene.getByText('LE SÉNÉGAL DANS L’ÂME.')).toHaveCount(0);
      await expect(
        scene.getByRole('button', { name: 'Animation 3D disponible avec JavaScript' }),
      ).toBeDisabled();
      // Le texte et la scène ont une place réservée avant l'hydratation.
      const before = await page.getByTestId('hero-viewport').boundingBox();
      releaseScripts();
      await page.getByTestId('hero-viewport').scrollIntoViewIfNeeded();
      await expect(scene).toHaveAttribute('data-renderer', 'webgl', { timeout: 25000 });
      await expect(scene.getByTestId('hero-emblem')).not.toBeVisible();
      await expect(scene.locator('figure')).toHaveCount(0);
      const after = await page.getByTestId('hero-viewport').boundingBox();
      expect(after?.height).toBe(before?.height);
    } finally {
      releaseScripts();
    }
  });

  test('volumes, pause GPU, changement d’univers et perte de contexte', async ({ page }) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByTestId('hero-viewport').scrollIntoViewIfNeeded();
    const scene = page.getByTestId('hero-scene');
    const stage = page.getByTestId('glass-stage');
    await expect(scene).toHaveAttribute('data-renderer', 'webgl', { timeout: 25000 });
    await expect(page.getByTestId('glass-canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect
      .poll(async () => Number(await stage.getAttribute('data-frames')))
      .toBeGreaterThan(3);
    // Horloge réelle : le changement automatique atteint aussi le moteur GPU.
    const initialUniverse = await scene.getAttribute('data-universe');
    await expect(scene).not.toHaveAttribute('data-universe', initialUniverse!, { timeout: 10000 });
    const automaticUniverse = await scene.getAttribute('data-universe');
    await expect(stage).toHaveAttribute('data-universe', automaticUniverse!);
    await expect(stage).toHaveAttribute('data-transition', 'idle');
    await scene
      .getByRole('button', { name: 'Mettre les animations et le défilement en pause' })
      .click();
    await expect(stage).toHaveAttribute('data-running', 'false');
    const pausedFrames = await stage.getAttribute('data-frames');
    await page.waitForTimeout(350);
    expect(await stage.getAttribute('data-frames')).toBe(pausedFrames);
    await scene.getByRole('button', { name: 'Voir l’univers Sénégal' }).click();
    await expect(stage).toHaveAttribute('data-universe', 'senegal');
    await scene.getByRole('button', { name: 'Reprendre les animations et le défilement' }).click();
    await expect(stage).toHaveAttribute('data-running', 'true');
    const previous = Number(await stage.getAttribute('data-frames'));
    await expect
      .poll(async () => Number(await stage.getAttribute('data-frames')))
      .toBeGreaterThan(previous);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(stage).toHaveAttribute('data-running', 'false');
    const hiddenFrames = await stage.getAttribute('data-frames');
    await page.waitForTimeout(350);
    expect(await stage.getAttribute('data-frames')).toBe(hiddenFrames);
    await page.getByTestId('hero-viewport').scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-running', 'true');
    // Un changement de préférence système doit détruire puis recréer la scène,
    // sans flash vide durable ni perte de l’univers choisi.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(scene).toHaveAttribute('data-renderer', 'static');
    await expect(page.getByTestId('glass-canvas')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(scene).toHaveAttribute('data-renderer', 'webgl', { timeout: 25000 });
    await expect(stage).toHaveAttribute('data-universe', 'senegal');
    await page.getByTestId('glass-canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement)
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext();
    });
    await expect(scene).toHaveAttribute('data-renderer', 'static');
    await expect(scene.getByTestId('hero-emblem')).toBeVisible();
    await expect(page.getByTestId('glass-canvas')).toHaveCount(0);
    await expect(scene.getByRole('img', { name: /Ensemble sportif vert/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
