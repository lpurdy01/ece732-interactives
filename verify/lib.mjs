/**
 * Shared helpers for browser-based verification.
 *
 * The point of this harness is to catch the failures a build check cannot see:
 * a canvas that silently paints nothing, a control that throws on interaction,
 * a readout that shows a wrong number, a layout that overflows on a phone.
 * Screenshots alone do not catch those -- the checks below do.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.map': 'application/json',
};

/** Serve a directory on an ephemeral port. Returns { origin, close }. */
export async function serve(root) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(root, rel);
    if (!file.startsWith(path.resolve(root))) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Collects console errors and uncaught exceptions for the life of a page. */
export function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`uncaught: ${err.message}`));
  page.on('requestfailed', (req) => {
    // Favicon 404s are noise; anything else is a real broken reference.
    if (!req.url().includes('favicon')) {
      errors.push(`request failed: ${req.url()} (${req.failure()?.errorText})`);
    }
  });
  return errors;
}

/**
 * Is anything actually drawn on this canvas?
 *
 * A canvas that throws during draw, or is sized 0, still renders as a blank
 * element and screenshots as a plausible-looking empty box. Counting distinct
 * pixel colours catches that; a real plot has many.
 */
export async function canvasInk(page, selector) {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return { found: false };
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    if (!width || !height) return { found: true, width, height, distinct: 0, painted: 0 };
    const { data } = ctx.getImageData(0, 0, width, height);
    const seen = new Set();
    let painted = 0;
    // Sample on a grid: reading every pixel of a retina canvas is slow.
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const i = (y * width + x) * 4;
        const key = `${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`;
        seen.add(key);
        if (data[i + 3] > 8) painted++;
      }
    }
    return { found: true, width, height, distinct: seen.size, painted };
  }, selector);
}

/**
 * Horizontal extent of *saturated* ink on a canvas, as a fraction of width.
 *
 * canvasInk() only asks whether anything was drawn, which a broken plot passes:
 * axes, gridlines and tick labels are ink too. This separates data from
 * furniture by saturation -- series curves are coloured, axes and text are
 * grey -- and reports how much of the plot width the data actually spans.
 *
 * Written after an external visual review caught a time-series plot whose
 * curve was squeezed into a sliver at the right edge while canvasInk() passed.
 */
export async function coloredInkSpan(page, selector) {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return { found: false };
    const { width, height } = canvas;
    const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
    let minX = width, maxX = -1, count = 0;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 40) continue;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        // Saturation: how far the channels spread. Greys sit near zero.
        if (Math.max(r, g, b) - Math.min(r, g, b) < 28) continue;
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    return {
      found: true,
      count,
      span: maxX < 0 ? 0 : (maxX - minX) / width,
      startsAt: maxX < 0 ? null : minX / width,
    };
  }, selector);
}

/** Does the page scroll sideways? The one layout bug users always notice. */
export async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth - doc.clientWidth,
    };
  });
}

/** Drag across an element in normalized (0..1) coordinates. */
export async function dragOn(page, selector, from, to, steps = 12) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no bounding box for ${selector}`);
  const at = (p) => [box.x + box.width * p[0], box.y + box.height * p[1]];
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x1 + (x2 - x1) * (i / steps), y1 + (y2 - y1) * (i / steps));
  }
  await page.mouse.up();
}

/** Set a range input and fire the events the page listens for. */
export async function setRange(page, selector, value) {
  await page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel);
    el.value = String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [selector, value]);
}

export class Report {
  constructor() { this.results = []; }

  check(name, ok, detail = '') {
    this.results.push({ name, ok: !!ok, detail });
    return ok;
  }

  get failures() { return this.results.filter((r) => !r.ok); }

  print() {
    for (const r of this.results) {
      console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    }
  }
}
