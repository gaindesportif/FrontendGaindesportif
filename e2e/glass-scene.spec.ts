import { test, expect } from './fixtures';
test('WebGL indisponible : illustration et interactions restent présentes', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        return kind.includes('webgl') ? null : Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  await page.goto('/accueil');
  await expect(page.getByTestId('pillar-star-stage')).toHaveAttribute('data-renderer', 'static');
  await expect(page.getByTestId('pillar-star-stage').locator('svg')).toBeVisible();
  await page.getByRole('button', { name: '02 La ville', exact: true }).click();
  await expect(page.getByTestId('pillar-star-stage')).toHaveAttribute('data-palette', 'ville');
});
test('vraie scène WebGL : pause GPU, rotation et perte de contexte', async ({ browser }) => {
  test.setTimeout(60000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/accueil');
  const host = page.getByTestId('pillar-star-stage');
  await expect(host).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
  const frame = () => host.locator('div[data-frame]').getAttribute('data-frame');
  // Changer l’ambiance et redimensionner ne doivent jamais inverser l’horloge
  // ni projeter les cinq branches hors de la composition.
  await expect
    .poll(
      async () => Number(await host.locator('div[data-expansion]').getAttribute('data-expansion')),
      { timeout: 22000 },
    )
    .toBeLessThan(0.02);
  await page.getByRole('button', { name: '02 La ville', exact: true }).click();
  await page.setViewportSize({ width: 1360, height: 960 });
  await expect
    .poll(
      async () => Number(await host.locator('div[data-expansion]').getAttribute('data-expansion')),
      { timeout: 15000 },
    )
    .toBeLessThan(0.02);
  const first = await frame();
  await expect.poll(frame).not.toBe(first);
  await page.getByRole('button', { name: 'Faire tourner l’étoile', exact: true }).click();
  await page.getByRole('button', { name: 'Mettre les animations en pause', exact: true }).click();
  await expect(host).toHaveAttribute('data-motion', 'paused');
  const paused = await frame();
  await page.waitForTimeout(300);
  expect(await frame()).toBe(paused);
  await page.getByRole('button', { name: 'Reprendre les animations', exact: true }).click();
  await expect.poll(frame).not.toBe(paused);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByTestId('pillar-star-canvas')).toHaveCount(0);
  await expect(host.locator('svg')).toHaveAttribute('data-ready', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(host).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
  await expect(page.getByTestId('pillar-star-canvas')).toHaveCount(1);
  await page.getByTestId('pillar-star-canvas').evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(host).toHaveAttribute('data-renderer', 'static');
  await expect(host.locator('svg')).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});

test('lion : ballon, rugissement et retours par pilier avant la reprise du cycle', async ({
  page,
}) => {
  test.setTimeout(125000);
  await page.addInitScript(() => {
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      start.apply(this, args);
      queueMicrotask(() => {
        const scene = document.querySelector<HTMLElement>('[data-lion-time]');
        document.documentElement.dataset.lionSound = scene?.dataset.lionAction || '';
      });
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (!(record.target instanceof HTMLElement)) continue;
        const { lionObject, lionAction } = record.target.dataset;
        if (!lionObject || !lionAction) continue;
        document.documentElement.dataset.lionStory = [
          ...new Set(
            (document.documentElement.dataset.lionStory || '')
              .split(' ')
              .filter(Boolean)
              .concat(lionObject + ':' + lionAction),
          ),
        ].join(' ');
      }
    });
    observer.observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-lion-object', 'data-lion-action'],
    });
  });
  await page.goto('/accueil');
  const stage = page.getByTestId('pillar-star-stage');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
  const hero = page.getByTestId('cinematic-hero');
  const scene = stage.locator('div[data-frame]');
  await expect(stage.getByRole('button', { name: /Rejouer|Son du lion/ })).toHaveCount(0);
  await expect(hero).toHaveAttribute('data-pillars-visible', 'false');
  // Un geste sur le décor débloque le son dans les navigateurs dont la lecture automatique est bloquée.
  await stage.click({ position: { x: 24, y: 24 } });
  await expect(page.locator('html')).toHaveAttribute('data-lion-sound', 'roar', { timeout: 12000 });
  await expect(hero).toHaveAttribute('data-phase', 'assembled', { timeout: 15000 });
  await expect(hero).toHaveAttribute('data-pillars-visible', 'true');
  const kids = page.locator('button[data-pillar="kids"]');
  await expect(kids).toHaveCSS('opacity', '1');
  // Le focus donne tout le temps de lire et empêche la disparition sous le clavier.
  await kids.focus();
  await page.getByRole('button', { name: 'Mettre les animations en pause', exact: true }).click();
  const paused = await scene.getAttribute('data-expansion');
  await page.waitForTimeout(500);
  expect(await scene.getAttribute('data-expansion')).toBe(paused);
  await page.getByRole('button', { name: 'Reprendre les animations', exact: true }).click();
  // Aucun survol involontaire ne maintient les légendes pendant la recette.
  await page.mouse.move(1, 1);
  await expect
    .poll(
      async () =>
        (await page.locator('html').getAttribute('data-lion-story'))
          ?.split(' ')
          .filter((step) => step.endsWith(':throw')),
      { timeout: 50000 },
    )
    .toEqual([
      'ball:throw',
      'tech:throw',
      'infra:throw',
      'event:throw',
      'media:throw',
      'kids:throw',
    ]);
  const steps = (await page.locator('html').getAttribute('data-lion-story'))!.split(' ');
  expect(steps.indexOf('ball:roar')).toBeGreaterThan(steps.indexOf('ball:throw'));
  expect(steps.indexOf('ball:roar')).toBeLessThan(steps.indexOf('tech:throw'));
  await expect(hero).toHaveAttribute('data-pillars-visible', 'false', { timeout: 40000 });
  await expect(kids).toHaveCSS('opacity', '0');
  await expect(
    page.getByRole('group', { name: 'Explorer les cinq piliers', exact: true }),
  ).toHaveCount(0);
  await expect(scene).toHaveAttribute('data-phase', 'separated', { timeout: 15000 });
  await expect(scene).toHaveAttribute('data-expansion', '1.000');
  await expect(hero).toHaveAttribute('data-phase', 'assembled', { timeout: 20000 });
  await expect(hero).toHaveAttribute('data-pillars-visible', 'true');
  await expect(page.locator('button[data-pillar="tech"]')).toHaveCSS('opacity', '1');
});
