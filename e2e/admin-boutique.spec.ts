import { test, expect, type Page, type Route, defaultCategories } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const owner = {
  id: 'owner-recette',
  username: 'recette',
  displayName: 'Compte de recette',
  role: 'owner',
  active: true,
  createdAt: '2026-10-19T00:00:00Z',
};
const product = {
  id: 'produit-recette',
  name: 'Article fictif de recette',
  slug: 'article-fictif-de-recette',
  description: 'Donnée fictive réservée aux tests automatisés.',
  category: 'maillots',
  stockQuantity: 100,
  priceXof: null as number | null,
  sizes: [] as string[],
  colors: [] as string[],
  availability: 'on_request',
  status: 'draft',
  media: [] as Array<{ id: string; url: string; type: string; alt: string; position: number }>,
  createdAt: '2026-10-19T00:00:00Z',
  updatedAt: '2026-10-19T00:00:00Z',
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6uHkAAAAASUVORK5CYII=',
  'base64',
);
function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
}
async function mockAdmin(
  page: Page,
  options: { authenticated?: boolean; configured?: boolean; role?: 'owner' | 'admin' } = {},
) {
  let authenticated = options.authenticated ?? true;
  const currentUser = { ...owner, role: options.role ?? 'owner' };
  let current = structuredClone(product);
  let ticketCount = 0;
  const categories = structuredClone(defaultCategories);
  await page.route('**/api/categories', (route) => json(route, { items: categories }));
  const requests: Array<{ path: string; method: string; body: Record<string, unknown> | null }> =
    [];
  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/admin/', '');
    const method = route.request().method();
    const body = route.request().postDataJSON() as Record<string, unknown> | null;
    requests.push({ path, method, body });
    if (path === 'auth/login') {
      if (body?.password === 'incorrect-password')
        return json(route, { message: 'Identifiant ou mot de passe incorrect.' }, 401);
      authenticated = true;
      return json(route, { user: currentUser });
    }
    if (!authenticated) return json(route, { message: 'Connectez-vous pour continuer.' }, 401);
    if (path === 'auth/me') return json(route, { user: currentUser });
    if (path === 'auth/logout') {
      authenticated = false;
      return route.fulfill({ status: 204 });
    }
    if (path === 'media/config')
      return json(route, {
        configured: options.configured ?? false,
        maxImageBytes: 10485760,
        maxVideoBytes: 52428800,
        maxMedia: 10,
        maxImages: 10,
        maxVideos: 0,
      });
    if (path === 'categories' && method === 'POST') {
      const label = String(body?.name);
      const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (categories.some((c) => c.value === value))
        return json(route, { message: 'Cette catégorie existe déjà.' }, 409);
      categories.push({ value, label });
      return json(route, { value, label }, 201);
    }
    if (path === 'accounts') return json(route, { items: [owner] });
    if (path === 'products' && method === 'GET')
      return json(route, { items: [current], total: 1, page: 1, pageSize: 24 });
    if (path === 'products' && method === 'POST') {
      current = { ...current, ...body } as typeof current;
      return json(route, current, 201);
    }
    if (path === `products/${product.id}` && method === 'GET') return json(route, current);
    if (path === `products/${product.id}` && method === 'PATCH') {
      current = { ...current, ...body } as typeof current;
      return json(route, current);
    }
    if (path === `products/${product.id}` && method === 'DELETE') {
      current.status = 'deleting';
      return json(route, { deleted: false, pendingMediaCleanup: 1 }, 202);
    }
    if (path.endsWith('/upload-signature')) {
      const mediaId = ++ticketCount === 1 ? 'media-recette' : `media-recette-${ticketCount}`;
      return json(route, {
        mediaId,
        uploadUrl: 'https://api.cloudinary.com/v1_1/recette/image/upload',
        fields: {
          api_key: 'public-test-key',
          signature: 'test-signature',
          timestamp: '1792368000',
          public_id: 'test-only/recette',
        },
        maxBytes: 10485760,
      });
    }
    if (/\/media\/media-recette(?:-\d+)?\/confirm$/.test(path)) {
      const id = path.split('/').at(-2)!;
      const media = {
        id,
        url: 'https://res.cloudinary.com/recette/image/upload/photo.png',
        type: 'image',
        alt: '',
        position: current.media.length,
      };
      if (!current.media.some((item) => item.id === id)) current.media.push(media);
      return json(route, media, 201);
    }
    if (/\/media\/media-recette(?:-\d+)?$/.test(path) && method === 'DELETE') {
      current.media = current.media.filter((item) => item.id !== path.split('/').at(-1));
      if (!current.media.some((item) => item.type === 'image')) current.status = 'draft';
      return json(route, { deleted: false }, 202);
    }
    return json(route, { message: 'Route de recette non prévue.' }, 404);
  });
  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: png }),
  );
  return requests;
}

test('administration : accès privé, erreur de connexion, ouverture et fermeture de session', async ({
  page,
}) => {
  await mockAdmin(page, { authenticated: false });
  await page.goto('/administration');
  await expect(page.getByRole('heading', { name: 'Accès à la boutique' })).toBeVisible();
  await page.getByRole('link', { name: 'Se connecter', exact: true }).click();
  await page.getByLabel('Identifiant du compte', { exact: true }).fill('recette');
  await page.getByLabel('Mot de passe', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('incorrect');
  await page.getByLabel('Mot de passe', { exact: true }).fill('synthetic-only-password');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vos produits' })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => /token|session|password/i.test(key)),
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connexion', exact: true })).toBeVisible();
});

test('administration : brouillon, erreur réseau avec champs conservés et Cloudinary non configuré', async ({
  page,
}) => {
  const requests = await mockAdmin(page);
  await page.goto('/administration/produits/nouveau');
  await expect(page.getByText('Photos du produit', { exact: true })).toBeVisible();
  await expect(
    page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Importer une vidéo', { exact: true })).toHaveCount(0);
  await page.getByLabel('Nom du produit', { exact: true }).fill('Article fictif de recette');
  await page.getByLabel('Catégorie', { exact: true }).selectOption('maillots');
  await page
    .getByLabel('Description et détails', { exact: true })
    .fill('Donnée fictive réservée aux tests automatisés.');
  await page.route('**/api/admin/products', (route) =>
    json(route, { message: 'Enregistrement indisponible pour ce test.' }, 503),
  );
  await page.getByRole('button', { name: 'Continuer vers les photos' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('indisponible');
  await expect(page.getByLabel('Nom du produit', { exact: true })).toHaveValue(
    'Article fictif de recette',
  );
  await page.unroute('**/api/admin/products');
  await page.getByRole('button', { name: 'Continuer vers les photos' }).click();
  await expect(page).toHaveURL(new RegExp(`/administration/produits/${product.id}$`));
  await expect(
    page.getByText('tant que Cloudinary n’est pas configuré', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Publier le produit', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('au moins une photo');
  expect(requests.some((request) => request.method === 'PATCH')).toBe(false);
});

test('administration : import image direct vers Cloudinary, publication et retrait', async ({
  page,
}) => {
  const requests = await mockAdmin(page, { configured: true });
  let uploadBody = '';
  await page.route('https://api.cloudinary.com/**', async (route) => {
    uploadBody = route.request().postData() || '';
    return json(
      route,
      { secure_url: 'https://res.cloudinary.com/recette/image/upload/photo.png' },
      200,
    );
  });
  await page.goto(`/administration/produits/${product.id}`);
  await expect(
    page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel('Sélectionner une ou plusieurs photos', { exact: true })
    .setInputFiles({ name: 'photo-recette.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Média ajouté et vérifié.')).toBeVisible();
  expect(uploadBody).toContain('photo-recette.png');
  expect(uploadBody).not.toContain('api_secret');
  expect(requests.some((request) => request.path.endsWith('/confirm'))).toBe(true);
  await page.getByLabel('Prix en F CFA (XOF)', { exact: true }).fill('15000');
  await page.getByLabel('Stock total disponible', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Publier le produit', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Aperçu avant publication' })).toBeVisible();
  expect(requests.some((request) => request.method === 'PATCH')).toBe(false);
  await page.getByRole('button', { name: 'Confirmer la publication', exact: true }).click();
  await expect(
    page
      .getByRole('main')
      .getByRole('status')
      .filter({ hasText: 'Produit publié dans la boutique.' }),
  ).toBeVisible();
  expect(requests.find((request) => request.method === 'PATCH')?.body).toMatchObject({
    priceXof: 15000,
    status: 'published',
  });
  await page.getByRole('button', { name: 'Retirer', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Supprimer le média' })
    .getByRole('button', { name: 'Confirmer le retrait', exact: true })
    .click();
  await expect(
    page.getByText('Sa suppression de Cloudinary reste en attente', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enregistrer sans publier', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retirer', exact: true })).toHaveCount(0);
  expect(
    requests.some(
      (request) => request.path.endsWith('/media/media-recette') && request.method === 'DELETE',
    ),
  ).toBe(true);
});

test('administration : erreur d’import image, envoi en attente et retrait avant nouvel essai', async ({
  page,
}) => {
  const requests = await mockAdmin(page, { configured: true });
  await page.route('https://api.cloudinary.com/**', (route) => route.abort('failed'));
  await page.goto(`/administration/produits/${product.id}`);
  await page
    .getByLabel('Sélectionner une ou plusieurs photos', { exact: true })
    .setInputFiles({ name: 'photo-recette.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Cet envoi n’a pas pu être confirmé',
  );
  await expect(
    page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel('Importer une vidéo', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Vérifier cet envoi', exact: true })).toBeVisible();
  expect(requests.some((request) => request.path.endsWith('/confirm'))).toBe(false);
  await page.getByRole('button', { name: 'Retirer cet envoi', exact: true }).click();
  await expect(
    page.getByText('Envoi retiré. Son nettoyage Cloudinary reste en attente.'),
  ).toBeVisible();
  await expect(
    page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel('Importer une vidéo', { exact: true })).toHaveCount(0);
});

test('administration : sélection de dix photos, progression et absence d’import vidéo', async ({
  page,
}) => {
  const requests = await mockAdmin(page, { configured: true });
  const uploaded: string[] = [];
  let releaseFirst!: () => void;
  const firstUpload = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  await page.route('https://api.cloudinary.com/**', async (route) => {
    uploaded.push(route.request().postData() || '');
    if (uploaded.length === 1) await firstUpload;
    return json(route, { secure_url: 'https://res.cloudinary.com/recette/image/upload/photo.png' });
  });
  await page.goto(`/administration/produits/${product.id}`);
  const images = page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true });
  await expect(images).toHaveAttribute('multiple', '');
  await images.setInputFiles(
    Array.from({ length: 10 }, (_, i) => ({
      name: `photo-${i + 1}.png`,
      mimeType: 'image/png',
      buffer: png,
    })),
  );
  await expect(
    page.getByRole('status').filter({ hasText: 'Envoi de l’image 1 sur 10' }),
  ).toBeVisible();
  await expect(images).toBeDisabled();
  releaseFirst();
  await expect(page.getByText('10 images ajoutées et vérifiées.', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').locator('img')).toHaveCount(10);
  expect(uploaded).toHaveLength(10);
  for (let i = 0; i < 10; i++) expect(uploaded[i]).toContain(`photo-${i + 1}.png`);
  expect(requests.filter((request) => request.path.endsWith('/upload-signature'))).toHaveLength(10);
  expect(requests.filter((request) => request.path.endsWith('/confirm'))).toHaveLength(10);
  await expect(images).toBeDisabled();
  await expect(page.getByLabel('Importer une vidéo', { exact: true })).toHaveCount(0);
});

test('administration : sélection trop grande ou invalide refusée avant envoi, places restantes respectées', async ({
  page,
}) => {
  const requests = await mockAdmin(page, { configured: true });
  await page.route('https://api.cloudinary.com/**', (route) => json(route, { uploaded: true }));
  await page.goto(`/administration/produits/${product.id}`);
  const images = page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true });
  const files = Array.from({ length: 11 }, (_, i) => ({
    name: `photo-${i + 1}.png`,
    mimeType: 'image/png',
    buffer: png,
  }));
  await images.setInputFiles(files);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('10 photos maximum');
  expect(requests.filter((request) => request.path.endsWith('/upload-signature'))).toHaveLength(0);
  await images.setInputFiles([
    files[0],
    { name: 'vide.png', mimeType: 'image/png', buffer: Buffer.alloc(0) },
  ]);
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Aucun fichier n’a été envoyé',
  );
  expect(requests.filter((request) => request.path.endsWith('/upload-signature'))).toHaveLength(0);
  await images.setInputFiles(files.slice(0, 9));
  await expect(page.getByText('9 images ajoutées et vérifiées.', { exact: true })).toBeVisible();
  await images.setInputFiles(files.slice(0, 2));
  await expect(page.getByRole('main').getByRole('alert')).toContainText('encore en ajouter 1');
  expect(requests.filter((request) => request.path.endsWith('/upload-signature'))).toHaveLength(9);
  await images.setInputFiles(files[9]);
  await expect(page.getByRole('main').locator('img')).toHaveCount(10);
  await expect(images).toBeDisabled();
  // Retirer une photo libère une place sans effacer les autres photos confirmées.
  await page.getByRole('button', { name: 'Retirer', exact: true }).first().click();
  await page
    .getByRole('dialog', { name: 'Supprimer le média' })
    .getByRole('button', { name: 'Confirmer le retrait', exact: true })
    .click();
  await expect(page.getByRole('main').locator('img')).toHaveCount(9);
  await expect(images).toBeEnabled();
});

test('administration : compléter une photo existante par neuf photos sélectionnées ensemble', async ({
  page,
}) => {
  const requests = await mockAdmin(page, { configured: true });
  await page.route('https://api.cloudinary.com/**', (route) => json(route, { uploaded: true }));
  await page.goto(`/administration/produits/${product.id}`);
  const images = page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true });
  await expect(images).toBeEnabled();
  await images.setInputFiles({ name: 'couverture.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('main').locator('img')).toHaveCount(1);
  await expect(page.getByText('1 / 10 photos', { exact: true })).toBeVisible();
  await expect(images).toBeEnabled();
  await images.setInputFiles(
    Array.from({ length: 9 }, (_, i) => ({
      name: `vue-${i + 1}.png`,
      mimeType: 'image/png',
      buffer: png,
    })),
  );
  await expect(page.getByText('9 images ajoutées et vérifiées.', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').locator('img')).toHaveCount(10);
  await expect(page.getByText('10 / 10 photos', { exact: true })).toBeVisible();
  expect(requests.filter((request) => request.path.endsWith('/confirm'))).toHaveLength(10);
  await expect(images).toBeDisabled();
});

test('administration : échec partiel du lot, photos conservées et reprise sans second upload', async ({
  page,
}) => {
  const requests = await mockAdmin(page, { configured: true });
  let cloudUploads = 0;
  let confirmationAvailable = false;
  await page.route('https://api.cloudinary.com/**', (route) => {
    cloudUploads++;
    return json(route, { uploaded: true });
  });
  await page.route('**/media/media-recette-2/confirm', (route) =>
    confirmationAvailable
      ? route.fallback()
      : json(route, { message: 'Confirmation indisponible pour la recette.' }, 503),
  );
  await page.goto(`/administration/produits/${product.id}`);
  const images = page.getByLabel('Sélectionner une ou plusieurs photos', { exact: true });
  await images.setInputFiles(
    Array.from({ length: 3 }, (_, i) => ({
      name: `photo-${i + 1}.png`,
      mimeType: 'image/png',
      buffer: png,
    })),
  );
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Confirmation indisponible',
  );
  await expect(page.getByRole('main').locator('img')).toHaveCount(1);
  await expect(
    page.getByText('1 image(s) ajoutée(s) et vérifiée(s).', { exact: false }),
  ).toBeVisible();
  expect(cloudUploads).toBe(2);
  expect(requests.filter((request) => request.path.endsWith('/upload-signature'))).toHaveLength(2);
  await expect(images).toBeDisabled();
  confirmationAvailable = true;
  await page.getByRole('button', { name: 'Vérifier cet envoi', exact: true }).click();
  await expect(page.getByRole('main').locator('img')).toHaveCount(2);
  await expect(images).toBeEnabled();
  expect(cloudUploads).toBe(2);
});

test('administration : suppression en attente, état honnête et relance possible', async ({
  page,
}) => {
  await mockAdmin(page);
  await page.goto('/administration');
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Supprimer le produit' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirmer la suppression', exact: true }).click();
  await expect(
    page
      .getByRole('main')
      .getByRole('status')
      .filter({ hasText: 'suppression des médias reste en attente' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Relancer le nettoyage', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modifier', exact: true })).toHaveCount(0);
});

test('administration : droits affichés, clavier, accessibilité et mobile', async ({ page }) => {
  await mockAdmin(page, { role: 'admin' });
  await page.goto('/administration/comptes');
  await expect(page.getByRole('heading', { name: 'Ma sécurité', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Créer un compte administrateur', exact: true }),
  ).toHaveCount(0);
  await page.goto('/administration/produits/nouveau');
  await page.getByLabel('Nom du produit', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Description et détails', { exact: true })).toBeFocused();
  const a11y = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(a11y.violations).toEqual([]);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('administration : catégorie personnalisée, stock, aperçu privé puis publication explicite', async ({
  page,
}) => {
  const requests = await mockAdmin(page, { configured: true });
  await page.route('https://api.cloudinary.com/**', (route) => json(route, { uploaded: true }));
  await page.goto('/administration/produits/nouveau');
  await expect(
    page
      .getByLabel('Catégorie', { exact: true })
      .getByRole('option', { name: 'Sénégal', exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByLabel('Catégorie', { exact: true })
      .getByRole('option', { name: 'Dakar', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Nom du produit', { exact: true }).fill(product.name);
  await page.getByLabel('Prix en F CFA (XOF)', { exact: true }).fill('15000');
  await page.getByLabel('Stock total disponible', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Créer une catégorie', exact: true }).click();
  await page.getByLabel('Nom de la catégorie', { exact: true }).fill('Casquettes de recette');
  await page.getByRole('button', { name: 'Créer la catégorie', exact: true }).click();
  await expect(page.getByLabel('Catégorie', { exact: true })).toHaveValue('casquettes-de-recette');
  await page.getByRole('button', { name: 'Continuer vers les photos', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/administration/produits/${product.id}$`));
  await page
    .getByLabel('Sélectionner une ou plusieurs photos', { exact: true })
    .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Média ajouté et vérifié.')).toBeVisible();
  await page.getByRole('button', { name: 'Publier le produit', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Aperçu avant publication' });
  await expect(preview.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  const bounds = await preview.boundingBox();
  expect(Math.abs(bounds!.x + bounds!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  await expect(preview).toContainText('2 article(s) en stock au total');
  await expect(preview).toContainText('Casquettes de recette');
  expect(
    requests.some((request) => request.method === 'PATCH' && request.body?.status === 'published'),
  ).toBe(false);
  await preview.getByRole('button', { name: 'Revenir aux modifications', exact: true }).click();
  await expect(preview).not.toBeVisible();
  await expect(page.getByLabel('Stock total disponible', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Publier le produit', exact: true }).click();
  await preview.getByRole('button', { name: 'Confirmer la publication', exact: true }).click();
  await expect(
    page.getByRole('main').getByRole('status').filter({ hasText: 'Produit publié' }),
  ).toBeVisible();
  expect(
    requests.filter(
      (request) => request.method === 'PATCH' && request.body?.status === 'published',
    ),
  ).toHaveLength(1);
  await page.route('**/api/catalogue?*', (route) =>
    json(route, { items: [], total: 0, page: 1, pageSize: 24 }),
  );
  await page.goto('/boutique?category=casquettes-de-recette');
  await expect(
    page.getByRole('button', { name: 'Casquettes de recette', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});
