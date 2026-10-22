import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Comptes, données et mots de passe synthétiques : aucun appel à la base ni envoi d’email.
const password = 'Mot-de-passe-recette-uniquement-42';
const recoveryCode = 'C'.repeat(43);
const alice = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'alice-recette@example.test',
  displayName: 'Alice recette',
  createdAt: '2026-10-21T00:00:00.000Z',
  emailVerifiedAt: null,
};
const bob = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'bob-recette@example.test',
  displayName: 'Bob recette',
  createdAt: '2026-10-21T00:00:00.000Z',
  emailVerifiedAt: null,
};
const product = {
  id: '33333333-3333-4333-8333-333333333333',
  slug: 'article-recette-compte',
  name: 'Article de recette du compte',
  description: 'Donnée synthétique réservée à la recette automatisée locale.',
  category: 'senegal',
  priceXof: 10000,
  sizes: [],
  colors: [],
  availability: 'on_request',
  status: 'published',
  media: [
    {
      id: 'media-recette-compte',
      type: 'image',
      url: 'https://res.cloudinary.com/gainde-test/image/upload/recette-compte.webp',
      alt: 'Photo de recette du compte',
      position: 0,
    },
  ],
  createdAt: '2026-10-21T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
};
type Customer = typeof alice;
type HistoryItem = { product: typeof product; viewedAt: string };
type CustomerRequest = {
  path: string;
  method: string;
  accountId: string | null;
  body: Record<string, unknown> | null;
};
function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: { 'Cache-Control': 'no-store, private' },
    json: value,
  });
}

async function mockCustomer(
  page: Page,
  options: {
    user?: Customer;
    wishlist?: (typeof product)[];
    history?: HistoryItem[];
    wishlistUnavailable?: boolean;
    emailEnabled?: boolean;
  } = {},
) {
  let user: Customer | null = options.user ?? null;
  const wishlists = new Map<string, (typeof product)[]>([
    [alice.id, structuredClone(options.wishlist ?? [])],
    [bob.id, []],
  ]);
  const histories = new Map<string, HistoryItem[]>([
    [alice.id, structuredClone(options.history ?? [])],
    [bob.id, []],
  ]);
  const requests: CustomerRequest[] = [];
  const prepared = new Map<string, Record<string, unknown>[]>();
  const historyEnabled = new Map<string, boolean>();
  const state = { wishlistUnavailable: options.wishlistUnavailable ?? false };
  let heldWishlist: { requested: () => void; wait: Promise<void>; status: number } | null = null;
  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({ path: 'public/images/senegal-vert.webp', contentType: 'image/webp' }),
  );
  await page.route('**/api/catalogue?*', (route) =>
    json(route, { items: [product], total: 1, page: 1, pageSize: 24 }),
  );
  await page.route(`**/api/catalogue/${product.slug}`, (route) => json(route, product));
  await page.route('**/api/customer/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/customer/', '');
    const method = route.request().method();
    const body = route.request().postDataJSON() as Record<string, unknown> | null;
    requests.push({ path, method, accountId: user?.id ?? null, body });
    if (path === 'config') return json(route, { emailEnabled: options.emailEnabled ?? true });
    if (path === 'auth/register') {
      user = { ...alice, displayName: String(body?.displayName), email: String(body?.email) };
      return json(route, { user, verificationQueued: options.emailEnabled ?? true }, 201);
    }
    if (path === 'auth/login') {
      if (body?.password !== password)
        return json(route, { message: 'Adresse email ou mot de passe incorrect.' }, 401);
      user = body?.email === bob.email ? bob : alice;
      return json(route, { user });
    }
    if (path === 'auth/forgot')
      return json(route, {
        message:
          'Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.',
      });
    if (path === 'auth/reset' || path === 'auth/verify')
      return body?.token === recoveryCode
        ? json(route, { ok: true })
        : json(route, { message: 'Lien invalide ou expiré.' }, 400);
    if (path === 'auth/resend-verification') return json(route, { queued: true, verified: false });
    if (!user) return json(route, { message: 'Connectez-vous pour continuer.' }, 401);
    if (path === 'auth/me') return json(route, { user });
    if (path === 'auth/logout') {
      user = null;
      return route.fulfill({ status: 204 });
    }
    if (path === 'wishlist' && method === 'GET') {
      if (state.wishlistUnavailable)
        return json(route, { message: 'Votre liste est momentanément indisponible.' }, 503);
      const items = structuredClone(wishlists.get(user.id) ?? []);
      if (heldWishlist) {
        const held = heldWishlist;
        heldWishlist = null;
        held.requested();
        await held.wait;
        if (held.status === 401)
          return json(route, { message: 'Session antérieure expirée.' }, 401).catch(
            () => undefined,
          );
      }
      return json(route, { items }).catch(() => undefined);
    }
    if (path === 'wishlist/merge' && method === 'POST') {
      if (Array.isArray(body?.productIds) && body.productIds.includes(product.id))
        wishlists.set(user.id, [product]);
      return json(route, { items: wishlists.get(user.id) ?? [] });
    }
    if (path === `wishlist/${product.id}` && ['PUT', 'DELETE'].includes(method)) {
      if (state.wishlistUnavailable)
        return json(route, { message: 'Votre liste n’a pas pu être modifiée.' }, 503);
      wishlists.set(user.id, method === 'PUT' ? [product] : []);
      return route.fulfill({ status: 204 });
    }
    if (path === 'history' && method === 'GET')
      return json(route, {
        items: histories.get(user.id) ?? [],
        enabled: historyEnabled.get(user.id) ?? true,
      });
    if (path === 'history/settings' && method === 'PATCH') {
      historyEnabled.set(user.id, Boolean(body?.enabled));
      if (!body?.enabled) histories.set(user.id, []);
      return json(route, { enabled: Boolean(body?.enabled) });
    }
    if (path === 'requests' && method === 'GET')
      return json(route, { items: prepared.get(user.id) ?? [] });
    if (path === 'requests' && method === 'POST') {
      prepared.set(user.id, [
        {
          id: product.id,
          product,
          productName: product.name,
          productSlug: product.slug,
          priceXof: product.priceXof,
          quantity: body?.quantity,
          size: body?.size ?? null,
          color: body?.color ?? null,
          createdAt: '2026-10-21T20:40:00Z',
        },
      ]);
      return route.fulfill({ status: 204 });
    }
    if (path === 'requests' && method === 'DELETE') {
      prepared.set(user.id, []);
      return route.fulfill({ status: 204 });
    }
    if (path === 'history' && method === 'POST') {
      histories.set(user.id, [{ product, viewedAt: '2026-10-21T12:30:00.000Z' }]);
      return route.fulfill({ status: 204 });
    }
    if (path === 'history' && method === 'DELETE') {
      histories.set(user.id, []);
      return route.fulfill({ status: 204 });
    }
    if (path === 'profile' && method === 'PATCH') {
      user = { ...user, displayName: String(body?.displayName ?? user.displayName) };
      return json(route, { user });
    }
    if (path === 'profile' && method === 'DELETE') {
      wishlists.delete(user.id);
      histories.delete(user.id);
      user = null;
      return route.fulfill({ status: 204 });
    }
    if (path === 'auth/password') return route.fulfill({ status: 204 });
    return json(route, { message: 'Route de recette non prévue.' }, 404);
  });
  return {
    requests,
    state,
    wishlists,
    histories,
    holdNextWishlist(status = 200) {
      let signalRequested!: () => void;
      let release!: () => void;
      const requested = new Promise<void>((resolve) => {
        signalRequested = resolve;
      });
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      heldWishlist = { requested: signalRequested, wait, status };
      return { requested, release };
    },
  };
}

async function expectNoPrivateStorage(page: Page) {
  const browserStorage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  for (const privateValue of [
    alice.email,
    bob.email,
    alice.id,
    bob.id,
    product.id,
    password,
    recoveryCode,
  ])
    expect(browserStorage).not.toContain(privateValue);
  expect(browserStorage).not.toMatch(/gs_customer_session|recoveryCode|passwordHash|tokenHash/);
}

test('compte : le BFF refuse les écritures sans origine ou venant d’un autre site', async ({
  request,
}) => {
  for (const headers of [{}, { Origin: 'https://autre-origine.example.test' }] as Record<
    string,
    string
  >[]) {
    const login = await request.post('/api/customer/auth/login', {
      headers,
      data: { email: alice.email, password },
    });
    expect(login.status()).toBe(403);
    expect(login.headers()['cache-control']).toContain('no-store');
    const deletion = await request.delete('/api/customer/profile', { headers });
    expect(deletion.status()).toBe(403);
  }
});

async function login(page: Page, customer: Customer = alice) {
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(customer.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
}

test('compte : inscription, confirmation par e-mail et espace privé sans stockage local', async ({
  page,
}) => {
  const fixture = await mockCustomer(page);
  await page.goto('/compte/inscription');
  await page.getByLabel('Votre nom', { exact: true }).fill(alice.displayName);
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(alice.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /confidentialité/i }).check();
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bienvenue chez Gaindé', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('status')).toContainText('boîte e-mail');
  await expectNoPrivateStorage(page);
  await page.getByRole('link', { name: 'Continuer', exact: true }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await expect(
    page.getByRole('heading', { name: `Bonjour, ${alice.displayName}`, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: `Bonjour, ${alice.displayName}`, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(recoveryCode, { exact: true })).toHaveCount(0);
  await expectNoPrivateStorage(page);
  expect(fixture.requests.find((item) => item.path === 'auth/register')?.body).toEqual({
    email: alice.email,
    displayName: alice.displayName,
    password,
    consent: true,
  });
});

test('compte : un favori demande la connexion puis suit le compte après rechargement', async ({
  page,
}) => {
  const fixture = await mockCustomer(page);
  await page.goto('/boutique');
  const add = page.getByRole('button', {
    name: `Ajouter ${product.name} à ma sélection`,
    exact: true,
  });
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page).toHaveURL(/\/compte\/connexion\?/);
  const intent = new URL(page.url()).searchParams;
  expect(intent.get('next')).toBe('/boutique');
  expect(intent.get('favorite')).toBe(product.id);
  expect(
    fixture.requests.some((item) => item.path.startsWith('wishlist/') && item.method === 'PUT'),
  ).toBe(false);
  await login(page);
  await expect(page).toHaveURL(/\/boutique$/);
  await expect(
    page.getByRole('button', { name: `Retirer ${product.name} de ma sélection`, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.getByRole('button', { name: `Retirer ${product.name} de ma sélection`, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.wishlists.get(alice.id)?.map((item) => item.id)).toEqual([product.id]);
  await expectNoPrivateStorage(page);
});

test('compte : une panne de connexion garde les champs et permet de reprendre', async ({
  page,
}) => {
  const fixture = await mockCustomer(page);
  await page.goto('/compte/connexion?next=https%3A%2F%2Fautre-origine.example.test');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(alice.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.route('**/api/customer/auth/login', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Connexion interrompue');
  await expect(page.getByLabel('Adresse e-mail', { exact: true })).toHaveValue(alice.email);
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveValue(password);
  expect(fixture.requests.some((item) => item.path === 'auth/login')).toBe(false);
  await page.unroute('**/api/customer/auth/login');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await expect(
    page.getByRole('heading', { name: `Bonjour, ${alice.displayName}`, exact: true }),
  ).toBeVisible();
});

for (const lateStatus of [200, 401])
  test(`compte : réponse tardive ${lateStatus} du compte précédent isolée du suivant`, async ({
    page,
  }) => {
    const fixture = await mockCustomer(page, { user: alice, wishlist: [product] });
    const held = fixture.holdNextWishlist(lateStatus);
    try {
      await page.goto('/compte');
      await held.requested;
      await expect(
        page.getByRole('heading', { name: `Bonjour, ${alice.displayName}`, exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
      await expect(page).toHaveURL(/\/compte\/connexion$/);
      await login(page, bob);
      await expect(
        page.getByRole('heading', { name: `Bonjour, ${bob.displayName}`, exact: true }),
      ).toBeVisible();
      held.release();
      await page.getByRole('button', { name: 'Mes favoris', exact: true }).click();
      await expect(page.getByRole('main').getByText(product.name, { exact: true })).toHaveCount(0);
      await expect(
        page.getByRole('main').getByText(alice.displayName, { exact: false }),
      ).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Ma sélection, 0 pièces/ })).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole('heading', { name: `Bonjour, ${bob.displayName}`, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('main').getByText(product.name, { exact: true })).toHaveCount(0);
      await expectNoPrivateStorage(page);
    } finally {
      held.release();
    }
  });

test('compte : navigation clavier, accessibilité et affichage étroit', async ({ page }) => {
  await mockCustomer(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/compte/connexion');
  const email = page.getByLabel('Adresse e-mail', { exact: true });
  await email.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Mot de passe', { exact: true })).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `compte à ${width}px`,
    ).toBe(true);
  }
  await email.fill(alice.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  const submit = page.getByRole('button', { name: 'Me connecter', exact: true });
  await submit.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: `Bonjour, ${alice.displayName}`, exact: true }),
  ).toBeVisible();
  const accountAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accountAccessibility.violations).toEqual([]);
});

test('compte : la PWA ne conserve ni page privée, ni API, ni identité hors connexion', async ({
  page,
  context,
}) => {
  await mockCustomer(page, { user: alice, wishlist: [product] });
  await page.goto('/compte');
  await expect(
    page.getByRole('heading', { name: `Bonjour, ${alice.displayName}`, exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await expectNoPrivateStorage(page);
  await context.setOffline(true);
  try {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Le réseau fait une pause.' })).toBeVisible();
    await expect(page.getByText(alice.email, { exact: true })).toHaveCount(0);
    const cacheEntries = await page.evaluate(async () =>
      (
        await Promise.all(
          (await caches.keys()).map(async (key) =>
            (await (await caches.open(key)).keys()).map((request) => request.url),
          ),
        )
      ).flat(),
    );
    expect(
      cacheEntries.some((url) =>
        /\/api\/customer(?:\/|$)|\/compte(?:\/|$)/.test(new URL(url).pathname),
      ),
    ).toBe(false);
  } finally {
    await context.setOffline(false);
  }
});

test('compte : consultation et demande préparée WhatsApp, effacement et désactivation', async ({
  page,
  context,
}) => {
  const fixture = await mockCustomer(page, { user: alice });
  await context.route('https://wa.me/**', (route) =>
    route.fulfill({ body: 'Ouverture WhatsApp simulée, aucun envoi.', contentType: 'text/plain' }),
  );
  await page.goto(`/boutique/${product.slug}`);
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await expect
    .poll(() => fixture.requests.filter((r) => r.path === 'history' && r.method === 'POST').length)
    .toBeGreaterThan(0);
  const link = page.getByTestId('product-whatsapp');
  await expect(link).toHaveAttribute('href', /^https:\/\/wa.me\//);
  const popupPromise = context.waitForEvent('page');
  await link.click();
  const popup = await popupPromise;
  await popup.close();
  await expect(
    page.getByRole('main').getByRole('status').filter({ hasText: 'Demande préparée ajoutée' }),
  ).toBeVisible();
  await page.goto('/compte');
  await page.getByRole('button', { name: 'Mes demandes WhatsApp', exact: true }).click();
  await expect(page.getByRole('main').getByText(product.name, { exact: true })).toBeVisible();
  await expect(page.getByText(/Il ne confirme ni l’envoi du message/)).toBeVisible();
  await page.getByRole('button', { name: 'Effacer mes demandes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vos demandes, au même endroit' })).toBeVisible();
  await page.getByRole('button', { name: 'Mon historique', exact: true }).click();
  await expect(page.getByRole('main').getByText(product.name, { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Enregistrer les produits que je consulte' }).uncheck();
  await expect(page.getByRole('main').getByText(product.name, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('checkbox', { name: 'Enregistrer les produits que je consulte' }),
  ).not.toBeChecked();
  await expectNoPrivateStorage(page);
});

test('compte : une ancienne sélection n’est importée que sur demande et une panne reste réessayable', async ({
  page,
}) => {
  const fixture = await mockCustomer(page, { user: alice });
  await page.addInitScript(
    ({ id, slug }) => localStorage.setItem('gainde-selection-v2', JSON.stringify([{ id, slug }])),
    product,
  );
  await page.goto('/boutique');
  await page.getByRole('button', { name: 'Ma sélection, 0 pièces' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Récupérer mon ancienne sélection' }),
  ).toBeVisible();
  expect(fixture.requests.some((r) => r.path === 'wishlist/merge')).toBe(false);
  await dialog.getByRole('button', { name: 'Récupérer mon ancienne sélection' }).click();
  await expect(dialog.getByTestId('saved-product')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('gainde-selection-v2')))
    .toBeNull();
  await page.keyboard.press('Escape');
  fixture.state.wishlistUnavailable = true;
  await page.getByRole('button', { name: 'Ma sélection, 1 pièces' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByTestId('saved-product')).toHaveCount(0);
  fixture.state.wishlistUnavailable = false;
  await dialog.getByRole('button', { name: 'Réessayer' }).click();
  await expect(dialog.getByTestId('saved-product')).toHaveCount(1);
});

test('compte : inscription depuis un favori, confirmation avant reprise de la fiche', async ({
  page,
}) => {
  const fixture = await mockCustomer(page);
  await page.goto('/boutique');
  await page
    .getByRole('button', { name: `Ajouter ${product.name} à ma sélection`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/compte\/connexion\?/);
  await page.getByRole('link', { name: 'Créer mon compte', exact: true }).click();
  await expect(page).toHaveURL(/\/compte\/inscription\?/);
  await page.getByLabel('Votre nom', { exact: true }).fill(alice.displayName);
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(alice.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /confidentialité/ }).check();
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bienvenue chez Gaindé', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('favorite')).toBe(product.id);
  expect(
    fixture.requests.filter((r) => r.path === `wishlist/${product.id}` && r.method === 'PUT'),
  ).toHaveLength(0);
  await page.getByRole('link', { name: 'Continuer', exact: true }).click();
  await expect(page).toHaveURL(/\/boutique$/);
  await expect(
    page.getByRole('button', { name: `Retirer ${product.name} de ma sélection`, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('compte : mot de passe oublié puis lien privé sans jeton dans l’URL après ouverture', async ({
  page,
}) => {
  await mockCustomer(page);
  await page.goto('/compte/recuperation');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(alice.email);
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Recevoir le lien', exact: true }).click();
  await expect(page.getByRole('main').getByRole('status')).toContainText('Si cette adresse');
  await page.goto(`/compte/reinitialiser#token=${recoveryCode}`);
  await expect(page).toHaveURL(/\/compte\/reinitialiser$/);
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(password);
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enregistrer le mot de passe', exact: true }).click();
  await expect(page.getByRole('main').getByRole('status')).toContainText('a été modifié');
  await expectNoPrivateStorage(page);
  await page.goto(`/compte/confirmer-email#token=${recoveryCode}`);
  await expect(page).toHaveURL(/\/compte\/confirmer-email$/);
  await page.getByRole('button', { name: 'Confirmer mon adresse', exact: true }).click();
  await expect(page.getByRole('main').getByRole('status')).toContainText('est confirmée');
});

test('compte : lien incomplet ou rejeté et service e-mail indisponible sans faux succès', async ({
  page,
}) => {
  await mockCustomer(page);
  await page.goto('/compte/reinitialiser');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('incomplet');
  await page.goto(`/compte/confirmer-email#token=${'X'.repeat(43)}`);
  await page.getByRole('button', { name: 'Confirmer mon adresse', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('invalide');
  await page.route('**/api/customer/auth/forgot', (route) =>
    json(route, { message: 'Service e-mail indisponible.' }, 503),
  );
  await page.goto('/compte/recuperation');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(alice.email);
  await page.getByRole('button', { name: 'Recevoir le lien', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('indisponible');
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte e-mail' })).toHaveCount(0);
});

test('compte : formulaires e-mail accessibles sur écran étroit et jeton consommé par clic', async ({
  page,
}) => {
  const fixture = await mockCustomer(page);
  for (const path of [
    '/compte/recuperation',
    `/compte/reinitialiser#token=${recoveryCode}`,
    `/compte/confirmer-email#token=${recoveryCode}`,
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole('main').locator('button[type=submit], form button').last(),
    ).toBeVisible();
    expect(
      fixture.requests.filter((r) => ['auth/reset', 'auth/verify'].includes(r.path)),
    ).toHaveLength(0);
    expect(
      (
        await new AxeBuilder({ page })
          .include('main')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('compte : sans e-mail, inscription et favoris utilisables sans faux message ni récupération', async ({
  page,
}) => {
  const fixture = await mockCustomer(page, { emailEnabled: false });
  await page.goto(`/compte/inscription?next=/boutique/${product.slug}&favorite=${product.id}`);
  await page.getByLabel('Votre nom', { exact: true }).fill(alice.displayName);
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(alice.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /confidentialité/ }).check();
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click();
  await expect(page.getByRole('main').getByRole('status')).toContainText('Votre compte est créé');
  await expect(page.getByRole('main').getByText(/Consultez votre boîte/)).toHaveCount(0);
  await page.getByRole('link', { name: 'Continuer', exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Retirer ${product.name} de ma sélection`, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/compte');
  await page.getByRole('button', { name: 'Mon profil', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Recevoir le lien de confirmation', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('main')).toContainText('ne sont pas activés');
  await page.getByLabel('Votre nom', { exact: true }).fill('Nom actualisé');
  await page.getByRole('button', { name: 'Enregistrer mon nom', exact: true }).click();
  await expect(page.getByRole('main').getByRole('status')).toContainText(
    'Votre nom a été mis à jour.',
  );
  await expect(page.getByRole('button', { name: 'Mon profil', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('heading', { name: 'Bonjour, Nom actualisé', exact: true }),
  ).toBeVisible();
  await page.goto('/compte/recuperation');
  await expect(page.getByRole('main')).toContainText(
    'La récupération par e-mail n’est pas disponible',
  );
  await expect(page.getByLabel('Adresse e-mail', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Contacter notre équipe', exact: true }),
  ).toHaveAttribute('href', '/contact');
  expect(
    fixture.requests.filter((r) => ['auth/forgot', 'auth/resend-verification'].includes(r.path)),
  ).toHaveLength(0);
  await expectNoPrivateStorage(page);
});
