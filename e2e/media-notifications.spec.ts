import { test, expect } from './fixtures';

test('Media : une autorisation déjà bloquée donne une action explicite', async ({ page }) => {
  test.skip(process.env.MEDIA_PUBLIC_ENABLED !== 'true', 'Lecture Media désactivée');
  await page.route('**/api/media-notifications/config', (route) =>
    route.fulfill({ json: { publicKey: 'B' + 'a'.repeat(86) } }),
  );
  await page.route('**/api/media/articles?*', (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 12 } }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
  });
  await page.goto('/media');
  await expect(page.getByText('Notifications bloquées dans le navigateur.')).toBeVisible();
  await page.getByRole('button', { name: 'S’abonner aux articles' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Ouvrez les réglages du site' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Se désabonner' })).toHaveCount(0);
});
