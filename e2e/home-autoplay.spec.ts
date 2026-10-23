import { test, expect } from './fixtures';
test('ambiance choisie stable : aucune navigation automatique pendant la lecture', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: '02 La ville', exact: true }).click();
  await page.clock.fastForward(30000);
  await expect(page.getByTestId('cinematic-hero')).toHaveAttribute('data-chapter', 'ville');
});
test('sortie écran : animation commune suspendue, reprise au retour', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByTestId('home-hero');
  await expect(hero).toHaveAttribute('data-motion', 'playing');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(hero).toHaveAttribute('data-motion', 'paused');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(hero).toHaveAttribute('data-motion', 'playing');
});
