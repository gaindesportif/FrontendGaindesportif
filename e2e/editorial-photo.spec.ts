import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
const id = 'e1234567-1234-4123-8123-123456789abc';
const imageId = 'a1234567-1234-4123-8123-123456789abc';
test.beforeEach(async ({ page }) => {
  const article = {
    id,
    slug: 'test-photo',
    title: 'TEST LOCAL — sélection de photo',
    excerpt: '',
    body: 'Un texte de recette.',
    category: 'actualites',
    author: '',
    status: 'draft',
    version: 1,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
    images: [],
  };
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
            createdAt: new Date().toISOString(),
          },
        },
      });
    if (path === `/api/admin/articles/${id}`) return route.fulfill({ json: article });
    if (path.endsWith('/images/upload-signature'))
      return route.fulfill({
        json: {
          id: imageId,
          uploadUrl: 'https://api.cloudinary.com/v1_1/test/image/upload',
          fields: { signature: 'synthetic-local-only' },
          maxBytes: 10485760,
        },
      });
    if (path.endsWith('/confirm'))
      return route.fulfill({
        json: {
          ...article,
          version: 2,
          images: [
            {
              id: imageId,
              url: 'https://res.cloudinary.com/test/image/upload/test-photo.webp',
              alt: '',
              caption: '',
              credit: '',
            },
          ],
        },
      });
    return route.fulfill({ status: 404, json: { message: 'Route non prévue par cette recette.' } });
  });
  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({ path: 'public/images/hero-dakar.webp', contentType: 'image/webp' }),
  );
  await page.route('https://api.cloudinary.com/**', (route) =>
    route.fulfill({
      json: { secure_url: 'https://res.cloudinary.com/test/image/upload/test-photo.webp' },
    }),
  );
});
test('photos : bouton visible, fenêtre native, aperçu, changement et annulation', async ({
  page,
}) => {
  await page.goto('/administration/media/nouveau');
  const choose = page.getByRole('button', { name: 'Choisir une photo', exact: true });
  await expect(choose).toBeVisible();
  await expect(page.getByText('Choisissez d’abord une photo pour activer l’envoi.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer la photo', exact: true })).toBeDisabled();
  const event = page.waitForEvent('filechooser');
  await choose.click();
  await (await event).setFiles('public/images/hero-dakar.webp');
  await expect(page.getByText('hero-dakar.webp', { exact: true })).toBeVisible();
  await expect(page.getByAltText('Aperçu de la photo sélectionnée')).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByAltText('Aperçu de la photo sélectionnée')
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Envoyer la photo', exact: true })).toBeEnabled();
  const same = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Changer de photo' }).click();
  await (await same).setFiles('public/images/hero-dakar.webp');
  await expect(page.getByText('hero-dakar.webp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler cette sélection' }).click();
  await expect(choose).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer la photo', exact: true })).toBeDisabled();
  await expect(page.getByAltText('Aperçu de la photo sélectionnée')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('photos : choix au clavier et accessibilité après sélection', async ({ page }) => {
  await page.goto('/administration/media/nouveau');
  const choose = page.getByRole('button', { name: 'Choisir une photo', exact: true });
  await choose.focus();
  const event = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await (await event).setFiles('public/images/hero-dakar.webp');
  await expect(page.getByText('Photo sélectionnée', { exact: false })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('photos : fichiers invalides expliqués dès le choix, puis reprise', async ({ page }) => {
  await page.goto('/administration/media/nouveau');
  let cloudRequests = 0;
  page.on('request', (r) => {
    if (r.url().includes('api.cloudinary.com')) cloudRequests++;
  });
  const input = page.getByLabel('Ajouter une photo');
  await input.setInputFiles({
    name: 'document.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Texte'),
  });
  await expect(page.locator('#main [role=alert]')).toContainText('Choisissez une photo');
  await input.setInputFiles({ name: 'vide.png', mimeType: 'image/png', buffer: Buffer.alloc(0) });
  await expect(page.locator('#main [role=alert]')).toContainText('vide');
  await input.setInputFiles({
    name: 'trop-grande.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(10485761, 1),
  });
  await expect(page.locator('#main [role=alert]')).toContainText('dépasse 10 Mo');
  await expect(page.getByRole('button', { name: 'Envoyer la photo', exact: true })).toBeDisabled();
  expect(cloudRequests).toBe(0);
  await input.setInputFiles('public/images/hero-dakar.webp');
  await expect(page.locator('#main [role=alert]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Envoyer la photo', exact: true })).toBeEnabled();
});
test('photos : sélection conservée pendant une panne de confirmation, reprise sans réenvoi', async ({
  page,
}) => {
  await page.goto(`/administration/media/${id}`);
  await page.getByRole('textbox', { name: /^Titre de l’article/ }).waitFor();
  await page.getByLabel('Ajouter une photo').setInputFiles('public/images/hero-dakar.webp');
  let uploads = 0;
  page.on('request', (r) => {
    if (r.url().includes('api.cloudinary.com')) uploads++;
  });
  await page.route('**/images/*/confirm', (route) =>
    route.fulfill({ status: 503, json: { message: 'Vérification indisponible.' } }),
  );
  await page.getByRole('button', { name: 'Envoyer la photo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Réessayer la vérification' })).toBeVisible();
  await expect(page.getByAltText('Aperçu de la photo sélectionnée')).toBeVisible();
  await page.unroute('**/images/*/confirm');
  await page.getByRole('button', { name: 'Réessayer la vérification' }).click();
  await expect(page.getByText('Photo ajoutée.', { exact: false })).toBeVisible();
  expect(uploads).toBe(1);
  await expect(page.getByAltText('Aperçu de la photo sélectionnée')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choisir une photo', exact: true })).toBeVisible();
});
