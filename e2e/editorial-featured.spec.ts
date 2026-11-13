import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
const savedMessage =
  process.env.MEDIA_PUBLIC_ENABLED === 'true'
    ? 'Article publié.'
    : 'Article prêt pour l’ouverture de Gaindé Media.';
const id = 'e1234567-1234-4123-8123-123456789abc';
const base = {
  id,
  slug: 'test-la-une',
  title: 'TEST — Un récit choisi à la une',
  excerpt: 'Un exemple de recette.',
  body: 'Un texte de recette.',
  category: 'actualites',
  author: '',
  featured: false,
  status: 'published',
  version: 1,
  publishedAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z',
  images: [
    {
      id: 'a1234567-1234-4123-8123-123456789abc',
      url: 'https://res.cloudinary.com/test/image/upload/test.webp',
      alt: 'Photo de recette',
      caption: '',
      credit: '',
    },
  ],
};
test.beforeEach(async ({ page }) => {
  await page.route('https://res.cloudinary.com/**', (r) =>
    r.fulfill({ path: 'public/images/hero-dakar.webp', contentType: 'image/webp' }),
  );
});
test('une : case accessible, enregistrement et conservation après rechargement', async ({
  page,
}) => {
  let article = { ...base };
  let selected: unknown;
  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me'))
      return route.fulfill({
        json: {
          user: {
            id,
            username: 'test-local',
            displayName: 'Rédaction de recette',
            role: 'admin',
            active: true,
            createdAt: base.updatedAt,
          },
        },
      });
    if (path === `/api/admin/articles/${id}`) {
      if (route.request().method() === 'PATCH') {
        const data = route.request().postDataJSON();
        selected = data.featured;
        article = { ...article, ...data, version: article.version + 1 };
      }
      return route.fulfill({ json: article });
    }
    return route.fulfill({ status: 404, json: { message: 'Route de test inconnue.' } });
  });
  await page.goto(`/administration/media/${id}`);
  const checkbox = page.getByRole('checkbox', { name: 'Mettre cet article à la une', exact: true });
  await expect(checkbox).not.toBeChecked();
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText(savedMessage, { exact: true })).toBeVisible();
  expect(selected).toBe(true);
  await page.reload();
  await expect(checkbox).toBeChecked();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await checkbox.uncheck();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText(savedMessage, { exact: true })).toBeVisible();
  expect(selected).toBe(false);
});
test('une : badge sur la publication mise en avant, filtre sans fausse une', async ({ page }) => {
  test.skip(
    process.env.MEDIA_PUBLIC_ENABLED !== 'true',
    'Consultation publique de la semaine 2 désactivée.',
  );
  await page.route('**/api/media/articles?*', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const chosen = { ...base, featured: true };
    const recent = {
      ...base,
      id: 'f1234567-1234-4123-8123-123456789abc',
      slug: 'test-recent',
      title: 'TEST — Publication récente',
      category: 'analyses',
      publishedAt: '2026-11-12T12:00:00.000Z',
    };
    const items = query.get('category') === 'analyses' ? [recent] : [chosen, recent];
    return route.fulfill({ json: { items, total: items.length, page: 1, pageSize: 12 } });
  });
  await page.goto('/media');
  await expect(page.locator('article').first().getByRole('heading')).toHaveText(base.title);
  const first = await page.locator('article').first().boundingBox();
  expect(first!.y).toBeLessThan(page.viewportSize()!.height * 0.6);
  const title = await page.locator('article').first().getByRole('heading').boundingBox();
  expect(title!.y + title!.height).toBeLessThan(page.viewportSize()!.height);
  await expect(
    page.locator('article').first().getByText('À la une', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('À la une', { exact: true })).toHaveCount(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Analyses', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByText('À la une', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
