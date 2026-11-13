import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
const origin = 'http://localhost:3100';
test.describe('Gaindé Media — recette locale réelle, Cloudinary simulé', () => {
  test.skip(
    process.env.MEDIA_RECIPE_TESTS !== 'true',
    'Harnais PostgreSQL local explicite requis.',
  );
  async function login(page: Page) {
    const r = await page.request.post('/api/admin/auth/login', {
      headers: { Origin: origin },
      data: { username: 'redaction-locale', password: 'Gainde-media-local-2026!' },
    });
    expect(r.ok()).toBe(true);
  }
  test.beforeEach(async ({ page }) => {
    const image = await readFile('public/images/hero-dakar.webp');
    await page.route('https://res.cloudinary.com/**', (route) =>
      route.fulfill({ body: image, contentType: 'image/webp' }),
    );
    await page.route('https://api.cloudinary.com/**', (route) =>
      route.fulfill({
        json: { secure_url: 'https://res.cloudinary.com/test/image/upload/local.jpg' },
      }),
    );
  });
  test('rédaction : long texte, photo obligatoire, champs facultatifs, aperçu, publication puis suppression', async ({
    page,
  }, info) => {
    await login(page);
    await page.goto('/administration/media/nouveau');
    const title = `TEST RECETTE ${info.project.name} ${Date.now()}`;
    await page.getByRole('textbox', { name: /^Titre de l’article/ }).fill(title);
    const body = 'Un long texte de recette pour contrôler la conservation intégrale.\n\n'.repeat(
      700,
    );
    await page.getByRole('textbox', { name: 'Texte de l’article', exact: true }).fill(body);
    await expect(
      page.getByRole('button', { name: 'Publier l’article', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page).toHaveURL(/administration\/media\/[0-9a-f-]{36}$/);
    const id = page.url().split('/').at(-1)!;
    try {
      await expect(
        page.getByRole('textbox', { name: 'Texte de l’article', exact: true }),
      ).toHaveValue(body);
      await page.getByLabel('Ajouter une photo').setInputFiles({
        name: 'photo.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxLkAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await page.getByRole('button', { name: 'Envoyer la photo' }).click();
      await expect(page.getByText('Photo ajoutée.', { exact: false })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /^Auteur/ })).toHaveValue('');
      await expect(page.getByRole('textbox', { name: /^Photographe/ })).toHaveValue('');
      await page.getByRole('button', { name: 'Aperçu', exact: true }).click();
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await page.getByRole('button', { name: 'Écrire', exact: true }).click();
      await page.getByRole('button', { name: 'Publier l’article', exact: true }).click();
      await expect(page.getByText('Article publié.', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retirer la photo' })).toBeDisabled();
      const stored = await (await page.request.get(`/api/admin/articles/${id}`)).json();
      expect(stored.body).toBe(body);
      expect(stored.author).toBe('');
      const response = await page.request.get(`/api/media/articles/${stored.slug}`);
      expect(response.ok()).toBe(true);
      await page.goto(`/media/${stored.slug}`);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(page.getByText(/^Par /)).toHaveCount(0);
      await expect(page.getByText(/^Photo :/)).toHaveCount(0);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.goto(`/administration/media/${id}`);
      await page.getByRole('button', { name: 'Repasser en brouillon' }).click();
      await expect(page.getByText('Brouillon enregistré.', { exact: true })).toBeVisible();
      expect((await page.request.get(`/api/media/articles/${stored.slug}`)).status()).toBe(404);
      await page.getByRole('button', { name: 'Supprimer l’article', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Supprimer cet article ?' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await page.getByRole('button', { name: 'Supprimer l’article', exact: true }).click();
      await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
      await expect(page).toHaveURL(/administration\/media$/);
    } finally {
      await page.request.delete(`/api/admin/articles/${id}`, { headers: { Origin: origin } });
    }
  });
  test('rédaction : panne réseau et reprise sans perdre le texte ; clavier et affichage mobile', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/administration/media/nouveau');
    await page.getByRole('textbox', { name: /^Titre de l’article/ }).fill('TEST PANNE — brouillon');
    await page
      .getByRole('textbox', { name: 'Texte de l’article', exact: true })
      .fill('Texte conservé après une panne.');
    await page.route('**/api/admin/articles', (route) =>
      route.fulfill({ status: 503, json: { message: 'Service de rédaction indisponible.' } }),
    );
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.locator('#main [role=alert]')).toContainText('indisponible');
    await expect(
      page.getByRole('textbox', { name: 'Texte de l’article', exact: true }),
    ).toHaveValue('Texte conservé après une panne.');
    await page.unroute('**/api/admin/articles');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page).toHaveURL(/administration\/media\/[0-9a-f-]{36}$/);
    const id = page.url().split('/').at(-1)!;
    try {
      await expect(
        page.getByRole('textbox', { name: 'Texte de l’article', exact: true }),
      ).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByRole('textbox', { name: /^Titre de l’article/ }).focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('textbox', { name: /^Introduction/ })).toBeFocused();
    } finally {
      await page.request.delete(`/api/admin/articles/${id}`, { headers: { Origin: origin } });
    }
  });
  test('photos : confirmation interrompue, reprise sans second envoi Cloudinary', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/administration/media/nouveau');
    await page.getByRole('textbox', { name: /^Titre de l’article/ }).fill('TEST PHOTO — reprise');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page).toHaveURL(/administration\/media\/[0-9a-f-]{36}$/);
    const id = page.url().split('/').at(-1)!;
    let uploads = 0;
    page.on('request', (r) => {
      if (r.url().startsWith('https://api.cloudinary.com/')) uploads++;
    });
    try {
      await page.route('**/api/admin/articles/*/images/*/confirm', (route) =>
        route.fulfill({ status: 503, json: { message: 'Vérification interrompue.' } }),
      );
      await page.getByLabel('Ajouter une photo').setInputFiles({
        name: 'image.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxLkAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await page.getByRole('button', { name: 'Envoyer la photo' }).click();
      await expect(page.getByRole('button', { name: 'Réessayer la vérification' })).toBeVisible();
      await page.unroute('**/api/admin/articles/*/images/*/confirm');
      await page.getByRole('button', { name: 'Réessayer la vérification' }).click();
      await expect(page.getByText('Photo ajoutée.', { exact: false })).toBeVisible();
      expect(uploads).toBe(1);
    } finally {
      await page.request.delete(`/api/admin/articles/${id}`, { headers: { Origin: origin } });
    }
  });
  test('public : rubriques, recherche, liens profonds, pagination et article inexistant', async ({
    page,
  }) => {
    await page.goto('/media');
    await expect(page.getByRole('heading', { name: 'Gaindé Media', exact: true })).toBeVisible();
    await expect(page.locator('article')).toHaveCount(12);
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(page.getByText('Page 2 sur 2', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Interviews', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(4);
    await page.getByRole('searchbox').fill('vérification 2');
    await page.getByRole('search').getByRole('button', { name: 'Rechercher', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.getByRole('searchbox')).toHaveValue('vérification 2');
    await page.goto('/media/inexistant-test-local');
    await expect(
      page.getByRole('heading', { name: 'On a perdu cette page de vue.' }),
    ).toBeVisible();
  });
  test('public : erreur réseau, reprise et recherche vide', async ({ page }) => {
    await page.route('**/api/media/articles?*', (route) =>
      route.fulfill({ status: 503, json: { message: 'Indisponible' } }),
    );
    await page.goto('/media');
    await expect(page.locator('#main [role=alert]')).toBeVisible();
    await page.unroute('**/api/media/articles?*');
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(12);
    await page.getByRole('searchbox').fill('aucun-resultat-zxyz');
    await page.getByRole('search').getByRole('button', { name: 'Rechercher', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aucun article trouvé' })).toBeVisible();
  });
  test('public : lecture, référencement, partage, accessibilité et cache PWA', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/media');
    await expect(page.locator('article')).toHaveCount(12);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const link = page.locator('article h2 a').filter({ hasText: 'TEST LOCAL —' }).first();
    const href = await link.getAttribute('href');
    await link.click();
    await expect(page.locator('article h1')).toBeVisible();
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `${origin}${href}`);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /^https:\/\/res.cloudinary.com\//,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (!test.info().project.name.includes('mobile')) {
      await page.getByRole('button', { name: 'Partager' }).click();
      await expect(page.getByText('Lien copié.', { exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
    });
    const cached = await page.evaluate(async () => {
      const result: string[] = [];
      for (const key of await caches.keys())
        for (const r of await (await caches.open(key)).keys()) result.push(new URL(r.url).pathname);
      return result;
    });
    expect(
      cached.every(
        (p) => !p.startsWith('/media') && !p.startsWith('/api') && !p.startsWith('/administration'),
      ),
    ).toBe(true);
  });
  test('BFF : origine étrangère, session absente et route hors liste interdites', async ({
    request,
  }) => {
    expect(
      (
        await request.post('/api/admin/articles', {
          headers: { Origin: 'https://example.test' },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect((await request.get('/api/admin/articles')).status()).toBe(401);
    expect((await request.get('/api/admin/editorial-secrets')).status()).toBe(404);
  });
});
