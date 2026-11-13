import { test, expect } from './fixtures';

test.describe('Gaindé Media — semaine 2 désactivée', () => {
  test.skip(
    process.env.MEDIA_PUBLIC_ENABLED === 'true',
    'Contrôler ce scénario avec la lecture publique bloquée.',
  );
  test('pages et API publiques bloquées ; rédaction accessible aux administrateurs', async ({
    page,
    request,
  }) => {
    for (const path of [
      '/media',
      '/media/inexistant',
      '/api/media/articles',
      '/api/media/articles/inexistant',
    ]) {
      expect((await request.get(path)).status()).toBe(404);
    }
    await page.goto('/boutique');
    expect(await page.locator('.site-header a[href="/media"]').count()).toBe(0);
    await page.route('**/api/admin/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me'))
        return route.fulfill({
          json: {
            user: {
              id: 'e1234567-1234-4123-8123-123456789abc',
              username: 'test-local',
              displayName: 'Rédaction de recette',
              role: 'admin',
              active: true,
              createdAt: '2026-11-13T12:00:00.000Z',
            },
          },
        });
      if (path.endsWith('/articles'))
        return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 12 } });
      return route.fulfill({ status: 404, json: { message: 'Route non prévue.' } });
    });
    await page.goto('/administration/media');
    await expect(page.getByRole('heading', { name: 'Gaindé Media', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouvel article', exact: true })).toBeVisible();
  });
});
