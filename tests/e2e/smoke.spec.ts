import { expect, test } from '@playwright/test';

test('shelf loads with a Gaelic greeting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tartan Talk' })).toBeVisible();
  await expect(page.getByText('Madainn mhath!')).toBeVisible();
});

test('works offline after first load', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tartan Talk' })).toBeVisible();
});
