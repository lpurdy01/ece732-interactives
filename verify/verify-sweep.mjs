/**
 * Exhaustive sweep of the interactives, in more than one browser engine.
 *
 *   node verify/verify-sweep.mjs            # chromium + firefox (+ webkit if its libs exist)
 *   node verify/verify-sweep.mjs chromium   # one engine
 *
 * verify-interactives.mjs checks that specific behaviours are RIGHT. This
 * checks that nothing is BROKEN anywhere a student can reach, by visiting every
 * state rather than a chosen few:
 *
 *   - every practice problem, every region and every whole-system target is
 *     answered through the real UI (typed, submitted with Enter or the button)
 *     and must be accepted -- so no answer on the site is unreachable;
 *   - every slider is driven to its minimum and maximum, every preset and
 *     every select option is clicked;
 *   - after each step the page must show no NaN / undefined / Infinity /
 *     [object ...] text, raise no console error, and keep ink on its canvases;
 *   - every visible control must be the topmost element at its own centre.
 *     That catches an overlay silently eating clicks -- the bug where a zoomed
 *     diagram crop painted over the next card and blocked its buttons;
 *   - at phone, tablet and desktop widths, nothing scrolls the page sideways.
 */

import * as pw from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, watchErrors, canvasInk, horizontalOverflow, setRange, Report } from './lib.mjs';
import { problems } from '../src/lib/diagram-problems.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');

const BAD_TEXT = /\bNaN\b|\bundefined\b|\bInfinity\b|\[object /;

async function badText(page, selector = 'main') {
  const text = await page.locator(selector).innerText();
  const m = text.match(BAD_TEXT);
  return m ? text.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ') : null;
}

/** Visible, enabled controls that are covered by some other element. */
async function coveredControls(page, scope = 'main') {
  return page.evaluate((scopeSel) => {
    const out = [];
    const controls = document.querySelector(scopeSel)
      .querySelectorAll('button, input, select, summary, a[href]');
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (el.closest('[hidden]') || el.closest('details:not([open]) > :not(summary)')) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (!top || top === el || el.contains(top) || top.contains(el)) continue;
      // A <label> wrapping its own input is fine.
      if (top.closest('label') && top.closest('label').contains(el)) continue;
      out.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`
               + ` under ${top.tagName.toLowerCase()}.${String(top.className?.baseVal ?? top.className).split(' ')[0]}`);
    }
    return out;
  }, scope);
}

/** Scroll through the page and collect covered controls at each viewport. */
async function coveredAnywhere(page, scope) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  const found = new Set();
  for (let y = 0; y < height; y += Math.floor(vh * 0.8)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    for (const c of await coveredControls(page, scope)) found.add(c);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return [...found];
}

/* ------------------------------------------------------------------------ */

async function sweepDecomposition(browser, origin, report, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/diagram-decomposition/`, { waitUntil: 'networkidle' });

  for (const p of problems) {
    await page.click(`button[data-problem="${p.id}"]`);
    await page.click('#dd-reset');
    await page.waitForTimeout(40);

    const covered = await coveredAnywhere(page, '#diagram-decomp');
    report.check(`${tag} decomp ${p.id}: no control covered by another element`, covered.length === 0, covered.slice(0, 4).join('; '));

    // Every region through the UI: odd ones with Enter, even with the button.
    const rejected = [];
    for (const r of p.regions) {
      const sel = `#dd-cards .dd-card[data-region="${r.n}"]`;
      await page.locator(`${sel} .dd-input`).fill(r.show);
      if (r.n % 2) await page.locator(`${sel} .dd-input`).press('Enter');
      else await page.locator(`${sel} .dd-check`).click();
      const status = await page.locator(`${sel} .dd-feedback`).getAttribute('data-status');
      if (status !== 'correct') rejected.push(`region ${r.n}: ${await page.locator(`${sel} .dd-feedback`).innerText()}`);
    }
    report.check(`${tag} decomp ${p.id}: every region answer is accepted through the UI`, rejected.length === 0, rejected.join(' | '));

    const rejectedT = [];
    for (const [i, t] of p.targets.entries()) {
      const sel = `#dd-targets .dd-card[data-target="${i}"]`;
      const text = t.display ?? t.answer;
      await page.locator(`${sel} .dd-input`).fill(text);
      await page.locator(`${sel} .dd-check`).click();
      const status = await page.locator(`${sel} .dd-feedback`).getAttribute('data-status');
      if (status !== 'correct') rejectedT.push(`target ${i + 1}: ${await page.locator(`${sel} .dd-feedback`).innerText()}`);
    }
    report.check(`${tag} decomp ${p.id}: every system target is accepted through the UI`, rejectedT.length === 0, rejectedT.join(' | '));

    const progress = await page.locator('#dd-progress').innerText();
    report.check(`${tag} decomp ${p.id}: progress reads fully solved`,
                 progress.includes(`Regions ${p.regions.length}/${p.regions.length} solved`)
                 && progress.includes(`System ${p.targets.length}/${p.targets.length} solved`), progress);
    report.check(`${tag} decomp ${p.id}: no NaN/undefined text`, !(await badText(page)), await badText(page));

    // Chips insert at the caret, and hint / show-answer work on a reset card.
    await page.click('#dd-reset');
    const first = '#dd-cards .dd-card[data-region="1"]';
    const chipCount = await page.locator(`${first} .dd-chip`).count();
    for (let c = 0; c < chipCount; c++) await page.locator(`${first} .dd-chip`).nth(c).click();
    const typed = await page.locator(`${first} .dd-input`).inputValue();
    const inputs = await page.locator(`${first} .dd-chip`).evaluateAll((els) => els.map((e) => e.dataset.insert));
    report.check(`${tag} decomp ${p.id}: symbol chips insert their names`, typed === inputs.join(''), `${typed} vs ${inputs.join('')}`);
    report.check(`${tag} decomp ${p.id}: chip preview renders without KaTeX errors`,
                 await page.locator(`${first} .katex-error`).count() === 0);
    await page.locator(`${first} .dd-hint-btn`).click();
    report.check(`${tag} decomp ${p.id}: hint becomes visible`, await page.locator(`${first} .dd-hint`).isVisible());
    await page.locator(`${first} .dd-reveal`).click();
    report.check(`${tag} decomp ${p.id}: show answer reveals the equation`,
                 await page.locator(`${first}.is-done .dd-eqshow .katex`).count() === 1);
    for (let i = 0; i < p.targets.length; i++) {
      await page.locator(`#dd-targets .dd-card[data-target="${i}"] .dd-hint-btn`).click();
    }
    report.check(`${tag} decomp ${p.id}: target hints produce text`,
                 (await page.locator('#dd-targets .dd-feedback').allInnerTexts()).every((t) => t.trim().length > 20));

    // Region toggle, and a click on a region jumps to its card.
    await page.uncheck('#dd-show-regions');
    report.check(`${tag} decomp ${p.id}: hiding regions removes the boxes`, await page.locator('#dd-diagram .dd-region').count() === 0);
    await page.check('#dd-show-regions');
    const last = p.regions[p.regions.length - 1].n;
    await page.locator(`#dd-diagram .dd-region[data-n="${last}"] .dd-region-box`).click({ force: true });
    await page.waitForTimeout(400);
    const focused = await page.evaluate(() => document.activeElement?.closest('.dd-card')?.dataset.region);
    report.check(`${tag} decomp ${p.id}: clicking region ${last} focuses its card`, focused === String(last), `focused ${focused}`);
    await page.click('#dd-reset');
  }

  // Deep links select the right problem.
  for (const p of problems) {
    await page.goto(`${origin}/interactives/diagram-decomposition/#${p.id}`, { waitUntil: 'networkidle' });
    const selected = await page.locator('.dd-problems button[aria-selected="true"]').getAttribute('data-problem');
    report.check(`${tag} decomp: #${p.id} deep link selects it`, selected === p.id, selected);
  }

  // Garbage input must produce a message, never an exception or raw markup.
  await page.goto(`${origin}/interactives/diagram-decomposition/`, { waitUntil: 'networkidle' });
  const sel = '#dd-cards .dd-card[data-region="1"]';
  for (const junk of ['', '(((', 'q_in +', '<img src=x onerror=alert(1)>', 'q_in ** 2', 'sin()', 'f(q_in)', '1/0', 'q_in = q_loss', 'pi*e']) {
    await page.locator(`${sel} .dd-input`).fill(junk);
    await page.locator(`${sel} .dd-check`).click();
    const fb = page.locator(`${sel} .dd-feedback`);
    const status = await fb.getAttribute('data-status');
    const injected = await page.locator(`${sel} .dd-feedback img`).count();
    report.check(`${tag} decomp: junk input ${JSON.stringify(junk)} handled`, status !== 'correct' && injected === 0 && (await fb.innerText()).length > 5,
                 `${status}: ${await fb.innerText()}`);
  }
  report.check(`${tag} decomp: no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function sweepSliders(browser, origin, report, tag, route, canvases, extra = async () => {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
  const name = route.split('/').filter(Boolean).pop();

  const problemsSeen = [];
  const inspect = async (label) => {
    const bad = await badText(page);
    if (bad) problemsSeen.push(`${label}: “${bad}”`);
    for (const c of canvases) {
      const ink = await canvasInk(page, c);
      if (!(ink.painted > 150)) problemsSeen.push(`${label}: ${c} blank (${ink.painted})`);
    }
  };

  const sliders = await page.locator('main input[type="range"]').evaluateAll((els) =>
    els.map((e) => ({ id: e.id, min: e.min, max: e.max, value: e.value })));
  for (const s of sliders) {
    for (const v of [s.min, s.max]) {
      await setRange(page, `#${s.id}`, v);
      await page.waitForTimeout(30);
      await inspect(`${s.id}=${v}`);
    }
    await setRange(page, `#${s.id}`, s.value);
  }
  // Every pair of extremes on the first four sliders: corner cases combine.
  const firstFour = sliders.slice(0, 4);
  for (let mask = 0; mask < 1 << firstFour.length; mask++) {
    for (const [i, s] of firstFour.entries()) await setRange(page, `#${s.id}`, mask & (1 << i) ? s.max : s.min);
    await page.waitForTimeout(30);
    await inspect(`corner ${mask.toString(2)}`);
  }
  for (const s of sliders) await setRange(page, `#${s.id}`, s.value);

  const buttons = await page.locator('main .presets button').count();
  for (let b = 0; b < buttons; b++) {
    await page.locator('main .presets button').nth(b).click();
    await page.waitForTimeout(40);
    await inspect(`preset ${b}`);
  }
  await extra(page, inspect);

  report.check(`${tag} ${name}: ${sliders.length} sliders at min/max, corners and ${buttons} presets: no NaN, no blank canvas`,
               problemsSeen.length === 0, problemsSeen.slice(0, 5).join(' | '));
  const covered = await coveredAnywhere(page, 'main');
  report.check(`${tag} ${name}: no control covered by another element`, covered.length === 0, covered.join('; '));
  report.check(`${tag} ${name}: no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function sweepLayout(browser, origin, report, tag) {
  const routes = ['/', '/interactives/', '/interactives/diagram-decomposition/',
                  '/interactives/physical-active-feedback/', '/interactives/operating-point-linearization/'];
  for (const [w, h] of [[360, 780], [768, 1024], [1440, 900]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
      for (const route of routes) {
        const page = await ctx.newPage();
        const errors = watchErrors(page);
        await page.goto(origin + route, { waitUntil: 'networkidle' });
        const { overflow } = await horizontalOverflow(page);
        const covered = await coveredAnywhere(page, 'main');
        report.check(`${tag} ${w}px ${scheme} ${route}: no sideways scroll, no covered controls, no errors`,
                     overflow <= 1 && covered.length === 0 && errors.length === 0,
                     `overflow ${overflow}; covered ${covered.slice(0, 3)}; ${errors.join(' | ')}`);
        await page.close();
      }
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------------ */

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const engines = (wanted.length ? wanted : ['chromium', 'firefox', 'webkit']);
const server = await serve(DIST);
const report = new Report();
const skipped = [];

try {
  for (const engine of engines) {
    let browser;
    try {
      browser = await pw[engine].launch();
    } catch (err) {
      skipped.push(`${engine}: ${err.message.split('\n').find((l) => /missing|not found|Executable/i.test(l))?.replace(/[║╔╗╚╝═]/g, '').trim() ?? 'failed to launch'}`);
      continue;
    }
    const tag = `[${engine}]`;
    await sweepDecomposition(browser, server.origin, report, tag);
    await sweepSliders(browser, server.origin, report, tag, '/interactives/physical-active-feedback/', ['#pf-splane', '#pf-response'],
      async (page, inspect) => {
        await page.uncheck('#pf-locus'); await inspect('locus off'); await page.check('#pf-locus');
      });
    await sweepSliders(browser, server.origin, report, tag, '/interactives/operating-point-linearization/', ['#op-taylor', '#op-pend'],
      async (page, inspect) => {
        for (const fn of ['cos', 'sin', 'sqrt', 'square']) {
          await page.selectOption('#op-fn', fn);
          for (const order of [0, 1, 2, 3, 4, 5]) {
            await setRange(page, '#op-order', order);
            for (const edge of ['min', 'max']) {
              const v = await page.locator('#op-x').getAttribute(edge);
              await setRange(page, '#op-x', v);
              await page.waitForTimeout(15);
              await inspect(`${fn} order ${order} x=${v}`);
            }
          }
        }
      });
    await sweepSliders(browser, server.origin, report, tag, '/interactives/eigenvector-geometry/', ['#eig-canvas']);
    await sweepSliders(browser, server.origin, report, tag, '/interactives/second-order-response/', ['#splane', '#response']);
    await sweepLayout(browser, server.origin, report, tag);
    await browser.close();
  }
} finally {
  await server.close();
}

console.log('\nInteractive sweep');
report.print();
for (const s of skipped) console.log(`  SKIP  ${s}`);
const failed = report.failures.length;
console.log(`\n${report.results.length - failed}/${report.results.length} checks passed`
            + (skipped.length ? `; ${skipped.length} engine(s) skipped` : ''));
if (!report.results.length) { console.error('no engine could run'); process.exit(2); }
if (failed) { console.error(`\n${failed} FAILURE(S)`); process.exit(1); }
