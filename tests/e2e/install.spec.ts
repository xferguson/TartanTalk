import { expect, test, type Page } from '@playwright/test';

// Chromium only fires `beforeinstallprompt` for a real installable visit, so tests dispatch it.
async function fireInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(e, { prompt: async () => undefined, userChoice: Promise.resolve({ outcome: 'accepted' }) });
    window.dispatchEvent(e);
  });
}

const banner = (page: Page) => page.getByRole('region', { name: 'Install Tartan Talk' });

test.describe('on a phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 } });

  test('offers install, and "Not now" keeps it away across reloads', async ({ page }) => {
    await page.goto('/');
    await fireInstallPrompt(page);
    await expect(banner(page)).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(banner(page)).toBeHidden();

    await page.reload();
    await fireInstallPrompt(page);
    await expect(page.getByRole('heading', { name: 'Madainn mhath!' })).toBeVisible();
    await expect(banner(page)).toBeHidden();
  });

  test('asks again once the two weeks are up', async ({ page }) => {
    await page.addInitScript(() => {
      const fifteenDays = 15 * 24 * 60 * 60 * 1000;
      localStorage.setItem('tt-install', JSON.stringify({ dismissedAt: Date.now() - fifteenDays, installed: false }));
    });
    await page.goto('/');
    await fireInstallPrompt(page);
    await expect(banner(page)).toBeVisible();
  });

  test('Install opens the browser dialog and then goes away for good', async ({ page }) => {
    await page.goto('/');
    await fireInstallPrompt(page);
    await page.getByRole('button', { name: 'Install' }).click();
    await expect(banner(page)).toBeHidden();
    const stored = await page.evaluate(() => localStorage.getItem('tt-install'));
    expect(JSON.parse(stored ?? '{}').installed).toBe(true);
  });

  test('stays quiet in the installed app', async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) => {
        const list = real(q);
        if (!q.includes('display-mode: standalone')) return list;
        return new Proxy(list, {
          get: (target, key) => {
            if (key === 'matches') return true;
            const value = Reflect.get(target, key, target) as unknown;
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      };
    });
    await page.goto('/');
    await fireInstallPrompt(page);
    await expect(page.getByRole('heading', { name: 'Madainn mhath!' })).toBeVisible();
    await expect(banner(page)).toBeHidden();
  });
});

test('never shows on desktop', async ({ page }) => {
  await page.goto('/');
  await fireInstallPrompt(page);
  await expect(page.getByRole('heading', { name: 'Madainn mhath!' })).toBeVisible();
  await expect(banner(page)).toBeHidden();
});
