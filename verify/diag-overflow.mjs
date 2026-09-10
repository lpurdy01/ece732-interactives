/** Ad-hoc helper: which elements stick out past the viewport at a given width?
 *  node verify/diag-overflow.mjs <route> [width] */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib.mjs';

const route = process.argv[2] ?? '/interactives/';
const width = Number(process.argv[3] ?? 390);
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const server = await serve(DIST);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 844 } });
const page = await ctx.newPage();
await page.goto(server.origin + route, { waitUntil: 'networkidle' });
const offenders = await page.evaluate(() => {
  const limit = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > limit + 1) {
      out.push({ tag: el.tagName, cls: String(el.className).slice(0, 45),
                 id: el.id, right: Math.round(r.right), width: Math.round(r.width) });
    }
  });
  return out.slice(0, 15);
});
console.log(`viewport ${width}px, route ${route}`);
console.table(offenders);
await browser.close();
await server.close();
