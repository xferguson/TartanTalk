import { expect, test } from '@playwright/test';

test('shelf loads with a Gaelic greeting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Madainn mhath!' })).toBeVisible();
});

test('bottom navigation reaches every room', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [label, heading] of [
    ['Library', 'Tartan library'],
    ['Tangles', 'Tangles'],
    ['Loom', 'At the loom'],
    ['Settings', 'Settings'],
    ['Shelf', 'Madainn mhath!'],
  ]) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
  await expect(page).toHaveURL(/#\/$/);
});

test('theme override persists across a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#/settings');
  await page.getByLabel('Peat fire').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Match system').check();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
});

test('works offline after first load, including fonts', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Madainn mhath!' })).toBeVisible();
  const fontsLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('700 16px "Fraunces Variable"') && document.fonts.check('16px "Source Sans 3 Variable"');
  });
  expect(fontsLoaded).toBe(true);
});
