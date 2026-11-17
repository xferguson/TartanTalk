// Renders the app icon (design/icon/icon.html) to PNGs in public/icons/.
// Usage: npm run icons
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = 'file://' + path.join(root, 'design/icon/icon.html');
const outputs = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
  ['favicon-32.png', 32, false],
];

const browser = await chromium.launch();
const tab = await browser.newPage();
for (const [name, size, maskable] of outputs) {
  await tab.setViewportSize({ width: size, height: size });
  await tab.goto(`${page}?size=${size}&maskable=${maskable ? 1 : 0}`);
  await tab.waitForFunction(() => document.title === 'ready');
  await tab.locator('#c').screenshot({ path: path.join(root, 'public/icons', name), omitBackground: true });
  console.log('wrote', name);
}
await browser.close();
