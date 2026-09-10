/** Ad-hoc probe: resolved theme colours and canvas ink distribution. */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib.mjs';
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const server = await serve(DIST);
const browser = await chromium.launch();

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(`${server.origin}/interactives/eigenvector-geometry/`, { waitUntil: 'networkidle' });
  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return ['--ink','--muted','--accent','--rule'].map(n => `${n}=${s.getPropertyValue(n).trim()}`).join('  ');
  });
  console.log(`${scheme}: ${vars}`);
  await ctx.close();
}

// Ink distribution on the modal z(t) canvas: which columns have any ink?
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`${server.origin}/interactives/modal-decomposition/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const dist = await page.evaluate(() => {
  const c = document.querySelector('#modes');
  const g = c.getContext('2d');
  const { width, height } = c;
  const d = g.getImageData(0, 0, width, height).data;
  let colsWithInk = 0;
  const bands = new Array(10).fill(0);
  for (let x = 0; x < width; x += 2) {
    let has = false;
    for (let y = 0; y < height; y += 2) {
      if (d[(y * width + x) * 4 + 3] > 8) { has = true; bands[Math.floor((x / width) * 10)]++; }
    }
    if (has) colsWithInk++;
  }
  return { width, colsSampled: Math.ceil(width / 2), colsWithInk, bands };
});
console.log('\nmodal z(t) ink by horizontal band (left→right):', dist.bands);
console.log(`columns with ink: ${dist.colsWithInk}/${dist.colsSampled}`);
await browser.close(); await server.close();
