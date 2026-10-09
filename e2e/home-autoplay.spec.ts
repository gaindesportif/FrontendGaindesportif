import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Ici, tester les temporisations sans mélanger l'horloge simulée et la boucle GPU.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        return kind === 'webgl2' ? null : Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  const start = new Date('2026-10-09T00:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
});

test('titre animé et trois univers défilant automatiquement sans clic', async ({ page }) => {
  await page.goto('/');
  const scene = page.getByTestId('hero-scene');
  const hero = page.getByTestId('home-hero');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-autoplay', 'playing');
  await expect(hero).toHaveAttribute('data-motion', 'playing');
  for (const line of await hero.locator('[data-motion-line]').all()) {
    expect(
      await line.evaluate((element) =>
        element
          .getAnimations()
          .some(
            (animation) =>
              animation instanceof CSSAnimation &&
              animation.animationName.includes('titlePanelEnter'),
          ),
      ),
    ).toBe(true);
  }
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  for (const universe of ['senegal', 'accessoires', 'dakar']) {
    await page.clock.runFor(6100);
    await expect(scene).toHaveAttribute('data-universe', universe);
  }
});

test('survol, focus, pause et sortie écran suspendent le défilement', async ({ page }) => {
  await page.goto('/');
  const scene = page.getByTestId('hero-scene');
  const hero = page.getByTestId('home-hero');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-autoplay', 'playing');

  const box = await scene.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + 20);
  await expect(scene).toHaveAttribute('data-autoplay', 'paused');
  await page.clock.runFor(12000);
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  await page.mouse.move(0, 0);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene).toHaveAttribute('data-autoplay', 'paused');
  await page.clock.runFor(12000);
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene).toHaveAttribute('data-autoplay', 'playing');

  const viewport = page.getByTestId('hero-viewport');
  await viewport.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 100, clientY: 100 });
  await expect(scene).toHaveAttribute('data-autoplay', 'paused');
  await page.clock.runFor(12000);
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  await viewport.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 100, clientY: 100 });

  const senegal = scene.getByRole('button', { name: 'Voir l’univers Sénégal' });
  await senegal.focus();
  await page.keyboard.press('Enter');
  await expect(scene).toHaveAttribute('data-autoplay', 'paused');
  await page.clock.runFor(12000);
  await expect(scene).toHaveAttribute('data-universe', 'senegal');
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await expect(scene).toHaveAttribute('data-autoplay', 'playing');
  await page.clock.runFor(6100);
  await expect(scene).toHaveAttribute('data-universe', 'accessoires');

  await scene
    .getByRole('button', { name: 'Mettre les animations et le défilement en pause' })
    .click();
  await expect(hero).toHaveAttribute('data-motion', 'paused');
  expect(
    await hero
      .locator('h1 > span')
      .last()
      .evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .every((animation) => ['paused', 'finished'].includes(animation.playState)),
      ),
  ).toBe(true);
  await page.clock.runFor(12000);
  await expect(scene).toHaveAttribute('data-universe', 'accessoires');
  await scene.getByRole('button', { name: 'Reprendre les animations et le défilement' }).click();
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
  });
  await expect(scene).toHaveAttribute('data-visible', 'false');
  await page.clock.runFor(12000);
  await expect(scene).toHaveAttribute('data-universe', 'accessoires');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-autoplay', 'playing');
  await page.clock.runFor(6100);
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
});

test('mouvement réduit : ni animation du titre ni changement automatique', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.getByTestId('home-hero');
  const scene = page.getByTestId('hero-scene');
  await expect(scene).toHaveAttribute('data-autoplay', 'paused');
  await page.clock.runFor(20000);
  await expect(scene).toHaveAttribute('data-universe', 'dakar');
  expect(
    await hero.locator('h1').evaluate((element) => element.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await expect(page.getByTestId('glass-canvas')).toHaveCount(0);
  await scene.getByRole('button', { name: 'Voir l’univers Accessoires' }).click();
  await expect(scene).toHaveAttribute('data-universe', 'accessoires');
});
