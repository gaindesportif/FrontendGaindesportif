import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  // Ici seul le texte est testé, le moteur graphique a sa propre suite.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        return kind === 'webgl2' ? null : Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
});

test('entrée en panneaux depuis la droite, décalage entre lignes puis titre stable', async ({
  page,
}) => {
  await page.goto('/');
  const hero = page.getByTestId('home-hero');
  const title = page.getByRole('heading', { level: 1, name: 'LA FIERTÉ SE PORTE.', exact: true });
  await expect(hero).toHaveAttribute('data-enhanced', 'true');
  await expect(title.locator('[data-motion-line]')).toHaveCount(2);
  await expect(title.locator('[data-motion-line="1"]')).toHaveText('LA FIERTÉ');
  await expect(title.locator('[data-motion-line="2"]')).toHaveText('SE PORTE.');
  await page.evaluate(() => document.fonts.ready);

  const initial = await title.boundingBox();
  const snapshot = await title.evaluate((element) => {
    const lines = [...element.querySelectorAll<HTMLElement>('[data-motion-line]')];
    const animations = lines.map((line) =>
      line
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName.includes('titlePanelEnter'),
        )!,
    );
    // Phases CSS déterministes : mesurer le départ, le décalage, puis le repos.
    const sample = (time: number) => {
      animations.forEach((animation) => {
        animation.pause();
        animation.currentTime = time;
      });
      return lines.map((line) => new DOMMatrixReadOnly(getComputedStyle(line).transform).m41);
    };
    const start = sample(0);
    const moving = sample(350);
    const settled = sample(2000);
    const later = sample(10000);
    return {
      start,
      moving,
      settled,
      later,
      iterations: animations.map((animation) => animation.effect!.getTiming().iterations),
      duration: animations.map((animation) => animation.effect!.getTiming().duration),
      delays: lines.map((line) => line.style.getPropertyValue('--line-delay')),
      clipped: lines.every((line) => getComputedStyle(line.parentElement!).overflowX === 'clip'),
      opaque: lines.every((line) => getComputedStyle(line).opacity === '1'),
      filter: lines.map((line) => getComputedStyle(line).filter),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(snapshot.delays).toEqual(['0ms', '220ms']);
  expect(snapshot.start.every((x) => x > 0)).toBe(true);
  expect(snapshot.moving[0]).toBeLessThan(snapshot.moving[1]);
  expect(snapshot.moving.every((x) => x > 0)).toBe(true);
  expect(snapshot.settled).toEqual([0, 0]);
  expect(snapshot.later).toEqual(snapshot.settled);
  expect(snapshot.iterations).toEqual([1, 1]);
  expect(snapshot.duration).toEqual([1050, 1050]);
  expect(snapshot.clipped).toBe(true);
  expect(snapshot.opaque).toBe(true);
  expect(snapshot.filter).toEqual(['none', 'none']);
  expect(snapshot.overflow).toBe(false);
  const after = await title.boundingBox();
  expect(after?.width).toBe(initial?.width);
  expect(after?.height).toBe(initial?.height);
});

test('reflet sur les deux lignes : lumière mobile, lettres fixes et repli statique', async ({
  page,
}) => {
  await page.goto('/');
  const title = page.getByTestId('kinetic-title');
  await expect(page.getByTestId('home-hero')).toHaveAttribute('data-enhanced', 'true');
  const snapshot = await title.evaluate((element) => {
    const lines = [...element.querySelectorAll<HTMLElement>('[data-motion-line]')];
    const animations = lines.map((line) =>
      line
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSAnimation && animation.animationName.includes('titleSheen'),
        )!,
    );
    lines.forEach((line) =>
      line.getAnimations().forEach((animation) => {
        if (
          animation instanceof CSSAnimation &&
          animation.animationName.includes('titlePanelEnter')
        )
          animation.finish();
      }),
    );
    const sample = (time: number) => {
      animations.forEach((animation) => {
        animation.pause();
        animation.currentTime = time;
      });
      return lines.map((line) => ({
        position: getComputedStyle(line).backgroundPosition,
        x: new DOMMatrixReadOnly(getComputedStyle(line).transform).m41,
        background: getComputedStyle(line).backgroundImage,
        clip: getComputedStyle(line).backgroundClip,
        opacity: getComputedStyle(line).opacity,
      }));
    };
    return {
      start: sample(1700),
      passing: sample(3300),
      iterations: animations.map((a) => a.effect!.getTiming().iterations),
    };
  });
  for (let index = 0; index < 2; index++) {
    expect(snapshot.passing[index].position).not.toBe(snapshot.start[index].position);
    expect(snapshot.passing[index].background).toContain('linear-gradient');
    expect(snapshot.passing[index].clip).toBe('text');
    expect(snapshot.passing[index].opacity).toBe('1');
    expect(snapshot.start[index].x).toBe(0);
    expect(snapshot.passing[index].x).toBe(0);
  }
  expect(snapshot.iterations).toEqual([Infinity, Infinity]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => title.evaluate((element) => element.getAnimations({ subtree: true }).length))
    .toBe(0);
  const reduced = await title.locator('[data-motion-line]').evaluateAll((lines) =>
    lines.map((line) => ({
      background: getComputedStyle(line).backgroundImage,
      ink: getComputedStyle(line).getPropertyValue('-webkit-text-fill-color'),
      color: getComputedStyle(line).color,
    })),
  );
  expect(reduced.every((line) => line.background === 'none' && line.ink === line.color)).toBe(true);
});

test('pause commune : le texte reprend sans sauter ni continuer en arrière-plan', async ({
  page,
}) => {
  await page.goto('/');
  const title = page.getByTestId('kinetic-title');
  const scene = page.getByTestId('cinematic-hero');
  await expect(page.getByTestId('home-hero')).toHaveAttribute('data-enhanced', 'true');
  // Replacer l'entrée avant la pause même si le chargement de page l'a déjà terminée.
  await title.evaluate((element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.currentTime = 250;
    }
  });
  await scene.getByRole('button', { name: 'Mettre les animations en pause' }).click();
  await expect(page.getByTestId('home-hero')).toHaveAttribute('data-motion', 'paused');
  // L'appel play() de WAAPI forcerait un état JS qui ne suit plus la pause CSS.
  await expect
    .poll(() =>
      title.evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .every(
            (animation) =>
              ['paused', 'finished'].includes(animation.playState) && !animation.pending,
          ),
      ),
    )
    .toBe(true);
  const paused = await title.evaluate((element) =>
    element
      .getAnimations({ subtree: true })
      .map((animation) => ({ time: animation.currentTime, state: animation.playState })),
  );
  expect(paused.length).toBeGreaterThan(0);
  expect(paused.every((animation) => ['paused', 'finished'].includes(animation.state))).toBe(true);
  await page.waitForTimeout(300);
  const later = await title.evaluate((element) =>
    element
      .getAnimations({ subtree: true })
      .map((animation) => ({ time: animation.currentTime, state: animation.playState })),
  );
  expect(later).toEqual(paused);
  await scene.getByRole('button', { name: 'Reprendre les animations' }).click();
  await expect
    .poll(() =>
      title.evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .every((animation) => ['running', 'finished'].includes(animation.playState)),
      ),
    )
    .toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => title.evaluate((element) => element.getAnimations({ subtree: true }).length))
    .toBe(0);
  await expect(title).toBeVisible();
});
