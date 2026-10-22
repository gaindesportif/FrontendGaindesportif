import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const id = '33333333-3333-4333-8333-333333333333';
async function setup(page: Page, mailConfigured = true) {
  let status = 'prepared',
    version = 0;
  let unavailable = false;
  const updates: unknown[] = [];
  await page.route('**/api/customer/**', (route) =>
    route.fulfill({ status: 401, json: { message: 'Session requise.' } }),
  );
  await page.route('**/api/admin/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me'))
      return route.fulfill({
        json: {
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            username: 'recette',
            displayName: 'Équipe recette',
            role: 'admin',
            active: true,
            createdAt: '2026-10-21T00:00:00Z',
          },
        },
      });
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      updates.push(body);
      if (unavailable)
        return route.fulfill({
          status: 503,
          json: { message: 'Service indisponible. Réessayez.' },
        });
      status = body.status;
      version++;
      return route.fulfill({
        json: { ok: true, notification: mailConfigured ? 'queued' : 'unconfigured' },
      });
    }
    return route.fulfill({
      json: {
        items: [
          {
            id,
            productName: 'Article synthétique de recette',
            quantity: 1,
            priceXof: 1000,
            size: null,
            color: null,
            createdAt: '2026-10-21T00:00:00Z',
            processingStatus: status,
            statusVersion: version,
            notificationStatus: version ? 'queued' : 'none',
            account: {
              displayName: 'Client recette',
              email: 'client@example.test',
              emailVerifiedAt: '2026-10-21T00:00:00Z',
            },
          },
        ],
        total: 1,
        page: 1,
        mailConfigured,
      },
    });
  });
  return {
    updates,
    fail: () => {
      unavailable = true;
    },
  };
}
test('demandes : statut confirmé explicitement, e-mail annoncé en attente et clavier accessible', async ({
  page,
}) => {
  const mock = await setup(page);
  await page.goto('/administration/demandes');
  await expect(page.getByRole('heading', { name: 'Demandes clients', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer : demande reçue', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(mock.updates).toHaveLength(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(mock.updates).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirmer : demande reçue', exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .include('main')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await dialog
    .getByRole('button', { name: 'Confirmer et informer le client', exact: true })
    .click();
  await expect(page.getByRole('main').getByRole('status')).toContainText('en attente');
  expect(mock.updates).toEqual([{ status: 'received', version: 0, confirmed: true }]);
  await expect(
    page.getByRole('button', { name: 'Confirmer : produit livré', exact: true }),
  ).toBeVisible();
});
test('demandes : panne réseau conservée dans la confirmation sans annoncer un envoi', async ({
  page,
}) => {
  const mock = await setup(page);
  mock.fail();
  await page.goto('/administration/demandes');
  await page.getByRole('button', { name: 'Confirmer : demande reçue', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Confirmer et informer le client', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('indisponible');
  await expect(page.getByRole('main').getByRole('status')).toHaveCount(0);
  await expect(dialog).toBeVisible();
});

test('demandes : suivi confirmé sans e-mail et sans demande de vérification client', async ({
  page,
}) => {
  const mock = await setup(page, false);
  await page.goto('/administration/demandes');
  await page.getByRole('button', { name: 'Confirmer : demande reçue', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Aucun e-mail ne sera envoyé');
  await dialog.getByRole('button', { name: 'Confirmer le statut', exact: true }).click();
  await expect(page.getByRole('main').getByRole('status')).toContainText('Aucun e-mail envoyé');
  expect(mock.updates).toEqual([{ status: 'received', version: 0, confirmed: true }]);
  await expect(
    page.getByRole('button', { name: 'Confirmer : produit livré', exact: true }),
  ).toBeVisible();
});
