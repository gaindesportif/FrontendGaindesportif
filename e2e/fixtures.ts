import { test as base } from '@playwright/test';
export * from '@playwright/test';
export const defaultCategories = [
  { value: 'maillots', label: 'Maillots' },
  { value: 't-shirts-polos', label: 'T-shirts et polos' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'survetements', label: 'Survêtements' },
  { value: 'chaussures', label: 'Chaussures' },
  { value: 'accessoires', label: 'Accessoires' },
  { value: 'equipements', label: 'Équipements' },
];
export const test = base.extend<{ categoryDefaults: void }>({
  categoryDefaults: [
    async ({ page }, use) => {
      await page.route('**/api/categories', (route) =>
        route.fulfill({ json: { items: defaultCategories } }),
      );
      await use();
    },
    { auto: true },
  ],
});
