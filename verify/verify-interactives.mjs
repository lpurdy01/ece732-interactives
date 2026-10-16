/**
 * End-user verification of the study-site interactives.
 *
 *   node verify/verify-interactives.mjs [--headed] [--keep-shots]
 *
 * Drives each interactive the way a student would -- drags the vector, moves
 * the sliders, clicks the presets, toggles the options -- and checks after
 * every step that:
 *
 *   - no console error or uncaught exception was raised,
 *   - the canvas actually has ink on it (a silently-failed draw still
 *     screenshots as a plausible empty box),
 *   - the numbers shown in the readout match values computed independently
 *     here, so a wrong formula is caught rather than admired,
 *   - the page does not scroll sideways at phone width,
 *   - both light and dark themes render.
 *
 * Screenshots land in verify/out/ for the visual-review pass
 * (scripts/review_visual.py), which is a separate and much slower check.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, watchErrors, canvasInk, coloredInkSpan, horizontalOverflow, dragOn,
         setRange, Report } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');
const OUT = path.resolve(HERE, 'out');
const headed = process.argv.includes('--headed');

const near = (a, b, tol) => Math.abs(a - b) <= tol;

async function shoot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function readoutText(page) {
  return (await page.locator('.readout').innerText()).replace(/\s+/g, ' ');
}

/* ------------------------------------------------------------------ */

async function checkEigenGeometry(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/eigenvector-geometry/`, { waitUntil: 'networkidle' });

  let ink = await canvasInk(page, '#eig-canvas');
  report.check('geometry: canvas has ink', ink.painted > 500,
               `${ink.painted} painted samples, ${ink.distinct} distinct colours`);

  // Default M = [1.4 0.8; 0.3 0.9] -> lambda = 1.7, 0.6 (trace 2.3, det 1.02).
  let text = await readoutText(page);
  report.check('geometry: default eigenvalues shown', /1\.70/.test(text) && /0\.60/.test(text),
               text.slice(0, 90));

  // A symmetric preset has a closed-form answer we can assert against.
  await page.locator('button[data-preset="2,1,1,2"]').click();
  await page.waitForTimeout(80);
  text = await readoutText(page);
  report.check('geometry: symmetric preset gives lambda 3 and 1',
               /3\.00/.test(text) && /1\.00/.test(text), text.slice(0, 90));

  // A rotation has no real eigenvector; the tool must say so rather than
  // inventing one. This is the case a naive implementation gets wrong.
  await page.locator('button[data-preset="0.707,-0.707,0.707,0.707"]').click();
  await page.waitForTimeout(80);
  text = await readoutText(page);
  report.check('geometry: rotation reported as complex pair',
               /complex pair/i.test(text), text.slice(0, 110));
  await shoot(page, 'geometry-rotation');

  // Regression: a NEGATIVE eigenvalue puts u and Mu 180 degrees apart. The
  // tool used to test only for 0 degrees, so it missed these entirely and told
  // the student to drive the angle to 0, which is impossible there.
  await page.locator('button[data-preset="-1,0,0,2"]').click();
  await page.waitForTimeout(80);
  await page.mouse.move(0, 0);
  {
    const box = await page.locator('#eig-canvas').boundingBox();
    // Aim u along [1,0], the eigenvector whose eigenvalue is -1.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
  }
  await page.waitForTimeout(80);
  text = await readoutText(page);
  const negAngle = parseFloat((text.match(/([\d.]+)°/) || [])[1] ?? 'NaN');
  report.check('geometry: negative eigenvalue gives a 180° angle',
               Number.isFinite(negAngle) && negAngle > 178, `angle = ${negAngle}°`);
  report.check('geometry: negative eigenvector still recognised as an eigenvector',
               /does not rotate it off its line/.test(text), text.slice(0, 140));
  await shoot(page, 'geometry-negative-eigenvalue');

  // Regression: M = cI has every direction as an eigenvector, and must not be
  // drawn as if it had two special ones.
  await page.locator('button[data-preset="2,0,0,2"]').click();
  await page.waitForTimeout(80);
  text = await readoutText(page);
  report.check('geometry: M = 2I reported as isotropic',
               /multiple of the\s*identity/i.test(text), text.slice(0, 160));
  await shoot(page, 'geometry-isotropic');

  // Back to a generic matrix, then exercise the toggles.
  await page.locator('button[data-preset="1.4,0.8,0.3,0.9"]').click();
  await page.locator('#showSvd').check();
  await page.locator('#showIter').check();
  await page.waitForTimeout(80);
  ink = await canvasInk(page, '#eig-canvas');
  report.check('geometry: overlays add ink', ink.painted > 500, `${ink.painted} painted`);
  await shoot(page, 'geometry-all-overlays');

  // Drag the input vector: the angle readout must change.
  const before = await readoutText(page);
  await dragOn(page, '#eig-canvas', [0.5, 0.5], [0.82, 0.28]);
  await page.waitForTimeout(80);
  const after = await readoutText(page);
  report.check('geometry: dragging u changes the readout', before !== after,
               'angle between u and v should update on drag');

  // Dragging onto an eigenvector should drive the angle to ~0. Find one and
  // aim at it: this checks the geometry, not just that something moved.
  const aimed = await page.evaluate(() => {
    const canvas = document.querySelector('#eig-canvas');
    const r = canvas.getBoundingClientRect();
    // Default preset's dominant eigenvector is about [0.94, 0.35].
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, r: Math.min(r.width, r.height) / 3 };
  });
  await page.mouse.move(aimed.cx, aimed.cy);
  await page.mouse.down();
  await page.mouse.move(aimed.cx + aimed.r * 0.94, aimed.cy - aimed.r * 0.35, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(80);
  const onEig = await readoutText(page);
  const angle = parseFloat((onEig.match(/([\d.]+)°/) || [])[1] ?? 'NaN');
  report.check('geometry: aiming u at an eigenvector drives the angle to ~0',
               Number.isFinite(angle) && angle < 6, `angle = ${angle}°`);
  await shoot(page, 'geometry-on-eigenvector');

  report.check('geometry: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */

async function checkSecondOrder(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/second-order-response/`, { waitUntil: 'networkidle' });

  for (const sel of ['#splane', '#response']) {
    const ink = await canvasInk(page, sel);
    report.check(`second-order: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const respSpan = await coloredInkSpan(page, '#response');
  report.check('second-order: response curve spans the plot width', respSpan.span > 0.5,
               `coloured ink spans ${(respSpan.span * 100).toFixed(0)}% of width`);

  // Independent physics: M=2, k=50, c=4 -> wn=5, zeta=4/(2*sqrt(100))=0.2
  await setRange(page, '#mass', 2);
  await setRange(page, '#stiff', 50);
  await setRange(page, '#damp', 4);
  await page.waitForTimeout(100);
  let text = await readoutText(page);
  const wn = parseFloat((text.match(/ωₙ\s*([\d.]+)/) || [])[1] ?? 'NaN');
  const zeta = parseFloat((text.match(/ζ\s*([\d.]+)/) || [])[1] ?? 'NaN');
  report.check('second-order: ωₙ = sqrt(k/M) = 5.00', near(wn, 5, 0.02), `shown ${wn}`);
  report.check('second-order: ζ = c/(2√(kM)) = 0.200', near(zeta, 0.2, 0.005), `shown ${zeta}`);

  // The closed form and the RK4 integration must agree; that agreement is the
  // whole claim the tool reproduces from the lecture.
  report.check('second-order: closed form agrees with RK4',
               /the two agree/.test(text), text.slice(text.indexOf('closed form'), 200));
  await shoot(page, 'second-order-underdamped');

  // Damping regimes must be classified correctly.
  const regimes = [
    { c: 0, want: 'undamped' },
    { c: 40, want: 'overdamped' },
  ];
  for (const { c, want } of regimes) {
    await setRange(page, '#damp', c);
    await page.waitForTimeout(100);
    text = await readoutText(page);
    report.check(`second-order: c=${c} classified ${want}`,
                 new RegExp(want, 'i').test(text), text.slice(0, 110));
  }

  // Critically damped: c = 2*sqrt(kM) = 2*sqrt(100) = 20 -> zeta = 1
  await setRange(page, '#damp', 20);
  await page.waitForTimeout(100);
  text = await readoutText(page);
  const zc = parseFloat((text.match(/ζ\s*([\d.]+)/) || [])[1] ?? 'NaN');
  report.check('second-order: ζ = 1 at c = 2√(kM)', near(zc, 1, 0.01), `shown ${zc}`);
  await shoot(page, 'second-order-critical');

  report.check('second-order: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */

async function checkModal(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/modal-decomposition/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);   // it animates; let a few frames land

  for (const sel of ['#chain', '#modes']) {
    const ink = await canvasInk(page, sel);
    report.check(`modal: ${sel} has ink`, ink.painted > 200, `${ink.painted} painted`);
  }

  // The trace must fill the plot, not hide in a sliver at one edge. An
  // external visual review caught exactly this: the time window started at
  // negative t, so for the first six seconds the curve was clipped to the
  // right edge and the axis showed negative time.
  const spread = await coloredInkSpan(page, '#modes');
  report.check('modal: z(t) trace spans the plot width', spread.span > 0.45,
               `coloured ink spans ${(spread.span * 100).toFixed(0)}% of width, `
               + `starting at ${((spread.startsAt ?? 0) * 100).toFixed(0)}%`);

  // Uniform chain m=1, k=30: omega_j = 2*sqrt(k/m)*sin((2j-1)*pi/14)
  const expected = [1, 2, 3].map((j) =>
    2 * Math.sqrt(30) * Math.sin(((2 * j - 1) * Math.PI) / 14));
  const text = await readoutText(page);
  const shown = [...text.matchAll(/mode \d\s+([\d.]+)/g)].map((m) => parseFloat(m[1]));
  report.check('modal: three natural frequencies listed', shown.length === 3, `got ${shown}`);
  if (shown.length === 3) {
    const okAll = shown.every((v, i) => near(v, expected[i], 0.02));
    report.check('modal: ωₙ match 2√(k/m)·sin((2j−1)π/14)', okAll,
                 `shown ${shown.map((v) => v.toFixed(2))} expected ${expected.map((v) => v.toFixed(2))}`);
  }

  // Releasing on a mode shape must excite exactly that one modal coordinate.
  const z0 = [...text.matchAll(/\]\s+([\d.-]+|0)\s/g)].map((m) => parseFloat(m[1]));
  report.check('modal: mode 1 excitation isolates z1',
               /mode 1/.test(text) && /only z1 is\s*non-zero|only z₁/.test(text.replace(/\s+/g, ' ')),
               'explanatory note should say a single modal coordinate is active');
  await shoot(page, 'modal-mode1');

  // The activation spectrum must agree with the modal decomposition: releasing
  // on a mode shape puts 100% of the participation on that mode and nothing on
  // the others. This checks the physics through the UI, not just that a canvas
  // was painted.
  const spectrumInk = await canvasInk(page, '#spectrum');
  report.check('modal: activation spectrum renders', spectrumInk.painted > 150,
               `${spectrumInk.painted} painted`);

  const pctFor = async () => (await page.locator('.readout').innerText());
  for (const modeIndex of [0, 1, 2]) {
    await page.locator(`input[name="exc"][value="${modeIndex}"]`).check();
    await page.waitForTimeout(180);
    const rows = await pctFor();
    // z(0) column: exactly one mode non-zero when released on a mode shape.
    const zeros = [...rows.matchAll(/\]\s+(-?[\d.]+)\s*$/gm)].map((m) => parseFloat(m[1]));
    const nonZero = zeros.filter((v) => Math.abs(v) > 0.01).length;
    report.check(`modal: exciting mode ${modeIndex + 1} isolates one modal coordinate`,
                 zeros.length === 0 || nonZero === 1,
                 `z(0) values ${zeros.map((v) => v.toFixed(2))}`);
  }

  // Pulling one mass is not a mode: all three must light up.
  await page.locator('input[name="exc"][value="-1"]').check();
  await page.waitForTimeout(250);
  const mixed = await readoutText(page);
  report.check('modal: pulling one mass excites all modes',
               /all three modal coordinates/i.test(mixed), mixed.slice(-160));
  await shoot(page, 'modal-all-modes');

  // Changing a mass must change the frequencies.
  await page.locator('button[data-preset="3,1,1,30,30,30"]').click();
  await page.waitForTimeout(250);
  const heavy = await readoutText(page);
  const heavyShown = [...heavy.matchAll(/mode \d\s+([\d.]+)/g)].map((m) => parseFloat(m[1]));
  report.check('modal: heavier first mass lowers the fundamental',
               heavyShown[0] < shown[0], `${heavyShown[0]} < ${shown[0]}`);

  report.check('modal: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */

async function checkDiagramDecomposition(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/diagram-decomposition/`, { waitUntil: 'networkidle' });

  const expected = { 'heated-block': 4, 'series-rlc': 4, 'two-inertia': 6, pendulum: 5, 'valve-tank': 3 };
  for (const [id, n] of Object.entries(expected)) {
    await page.click(`button[data-problem="${id}"]`);
    await page.waitForTimeout(60);
    const counts = await page.evaluate(() => ({
      badges: document.querySelectorAll('#dd-diagram .dd-region').length,
      cards: document.querySelectorAll('#dd-cards .dd-card').length,
      crops: document.querySelectorAll('#dd-cards .dd-cropsvg').length,
      wires: document.querySelectorAll('#dd-diagram .dd-wire').length,
      katexErrors: document.querySelectorAll('#diagram-decomp .katex-error').length,
    }));
    report.check(`decomp ${id}: ${n} numbered regions, cards and crops`,
                 counts.badges === n && counts.cards === n && counts.crops === n,
                 JSON.stringify(counts));
    report.check(`decomp ${id}: diagram drawn and no KaTeX errors`, counts.wires > 4 && counts.katexErrors === 0,
                 JSON.stringify(counts));
  }

  await page.click('button[data-problem="heated-block"]');
  const card = (n) => `#dd-cards .dd-card[data-region="${n}"]`;
  const answer = async (sel, text) => {
    await page.locator(`${sel} .dd-input`).fill(text);
    await page.locator(`${sel} .dd-check`).click();
    await page.waitForTimeout(40);
    return {
      status: await page.locator(`${sel} .dd-feedback`).getAttribute('data-status'),
      text: await page.locator(`${sel} .dd-feedback`).innerText(),
    };
  };

  // Diagnostics name the misreading, not just "wrong".
  let r = await answer(card(1), 'q_in + q_loss');
  report.check('decomp: flipped junction sign is named as a sign error',
               r.status === 'wrong' && /sign/i.test(r.text), r.text);
  r = await answer(card(2), 'CdT/C');
  report.check('decomp: missing integrator is named', r.status === 'wrong' && /integrator/i.test(r.text), r.text);
  r = await answer(card(2), 'dT/s');
  report.check('decomp: an internal signal is rejected with an explanation',
               r.status === 'invalid' && /inside this region/i.test(r.text), r.text);
  r = await answer(card(2), 'CdT*C/s');
  report.check('decomp: an inverted block is named', r.status === 'wrong' && /inverted/i.test(r.text), r.text);

  // Correct answers, including a rearranged form, are accepted.
  r = await answer(card(1), '-q_loss + q_in');
  report.check('decomp: rearranged correct answer accepted', r.status === 'correct', r.text);
  r = await answer(card(2), 'T = (1/C)*(1/s)*CdT');
  report.check('decomp: "lhs = rhs" form accepted', r.status === 'correct', r.text);
  report.check('decomp: solved card switches to its worked equation',
               await page.locator(`${card(1)}.is-solved .dd-eqshow .katex`).count() > 0);

  const target = (i) => `#dd-targets .dd-card[data-target="${i}"]`;
  r = await answer(target(1), 'R/(R*C*s + 1)');
  report.check('decomp: transfer function target accepts the right answer', r.status === 'correct', r.text);
  r = await answer(target(2), 'R/(R*C*s + 1)');
  report.check('decomp: disturbance TF rejects the manipulated-input TF', r.status !== 'correct', r.text);
  r = await answer(target(0), '(q_in - T/R + T_a/R)/C');
  report.check('decomp: state equation target accepts an expanded form', r.status === 'correct', r.text);
  await shoot(page, 'decomp-practice');

  // Progress survives a reload (localStorage), and reset clears it.
  await page.reload({ waitUntil: 'networkidle' });
  report.check('decomp: progress persists across reload',
               await page.locator(`${card(1)}.is-solved`).count() === 1);
  await page.click('#dd-reset');
  report.check('decomp: reset clears progress', await page.locator('#dd-cards .is-solved').count() === 0);

  // Nonlinear problem: the nonlinear block and the linearization targets.
  await page.click('button[data-problem="pendulum"]');
  // Wrong first: a solved card hides its input.
  r = await answer(card(5), 'm*g*l*theta');
  report.check('decomp pendulum: small-angle substitute is not accepted for the nonlinear block', r.status !== 'correct', r.text);
  r = await answer(card(5), 'm*g*l*sin(theta)');
  report.check('decomp pendulum: nonlinear block equation accepted', r.status === 'correct', r.text);
  r = await answer(target(3), 'm*g*l*cos(theta_op)');
  report.check('decomp pendulum: linearized slope accepted', r.status === 'correct', r.text);

  // Study mode shows every equation.
  await page.check('#dd-study');
  await page.waitForTimeout(60);
  const study = await page.evaluate(() => ({
    done: document.querySelectorAll('.dd-card.is-done').length,
    all: document.querySelectorAll('.dd-card').length,
    eqs: document.querySelectorAll('.dd-card .dd-eqshow .katex').length,
  }));
  report.check('decomp: study mode reveals every region and target',
               study.done === study.all && study.eqs >= study.all, JSON.stringify(study));
  await page.locator('#dd-signs-box summary').click();
  report.check('decomp: sign table lists every junction',
               await page.locator('#dd-signs tr').count() === 1 + 1, 'pendulum has one junction');
  await shoot(page, 'decomp-study');
  await page.uncheck('#dd-study');

  report.check('decomp: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */

async function checkPhysicalActive(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/physical-active-feedback/`, { waitUntil: 'networkidle' });

  for (const sel of ['#pf-splane', '#pf-response']) {
    const ink = await canvasInk(page, sel);
    report.check(`feedback: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const span = await coloredInkSpan(page, '#pf-response');
  report.check('feedback: response spans the plot width', span.span > 0.5, `${(span.span * 100).toFixed(0)}%`);

  // M=2, Kp=50, Cp=4, Ka=30, Ca=6 -> 2 s^2 + 10 s + 80 -> s = -2.5 ± j·sqrt(40 - 6.25)
  for (const [id, v] of [['#pf-M', 2], ['#pf-Kp', 50], ['#pf-Cp', 4], ['#pf-Ka', 30], ['#pf-Ca', 6]]) {
    await setRange(page, id, v);
  }
  await page.waitForTimeout(80);
  let text = await page.locator('#pf-readout').innerText();
  const im = Math.sqrt(40 - 6.25).toFixed(2);
  report.check('feedback: total eigenvalues from K_p+K_a and C_p+C_a', text.includes(`-2.50 ± ${im}j`), text.slice(0, 200));
  // Passive: 2 s^2 + 4 s + 50 -> -1 ± j·sqrt(25 - 1)
  report.check('feedback: passive eigenvalues from K_p and C_p only', text.includes(`-1.00 ± ${Math.sqrt(24).toFixed(2)}j`));
  const zeta = (10 / (2 * Math.sqrt(80 * 2))).toFixed(3);
  report.check(`feedback: ζ = C/(2√(KM)) = ${zeta}`, text.includes(zeta));

  await page.click('button[data-preset="cancel"]');
  await page.waitForTimeout(80);
  text = await page.locator('#pf-readout').innerText();
  report.check('feedback: C_a = −C_p puts eigenvalues on the imaginary axis',
               /0\.00 ± [\d.]+j/.test(text) && /undamped/.test(text), text.slice(0, 260));
  await shoot(page, 'feedback-cancel');

  await page.click('button[data-preset="over"]');
  await page.waitForTimeout(80);
  text = await page.locator('#pf-readout').innerText();
  report.check('feedback: over-cancelled damping reported unstable', /negative net damping/.test(text));

  await page.click('button[data-preset="soften"]');
  await page.waitForTimeout(80);
  text = await page.locator('#pf-readout').innerText();
  report.check('feedback: negative net stiffness reported unstable', /negative net stiffness/.test(text));

  report.check('feedback: velocity equation rendered', await page.locator('#pf-readout .katex').count() > 0);
  report.check('feedback: diagram drawn', await page.locator('.pf-figure .dd-wire').count() >= 14);
  report.check('feedback: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */

async function checkLinearization(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/operating-point-linearization/`, { waitUntil: 'networkidle' });

  for (const sel of ['#op-taylor', '#op-pend']) {
    const ink = await canvasInk(page, sel);
    report.check(`linearize: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }

  // cos about 60°, order 2: c0 = cos60, c1 = -sin60, c2 = -cos60/2.
  await setRange(page, '#op-x', 60);
  await setRange(page, '#op-order', 2);
  await page.waitForTimeout(60);
  let text = await page.locator('#op-taylor-readout').innerText();
  const want = [0.5, -Math.sin(Math.PI / 3), -0.25].map((v) => v.toFixed(4));
  report.check('linearize: Taylor coefficients of cos about 60°', want.every((w) => text.includes(w)),
               `want ${want} in ${text.slice(0, 120)}`);

  // x² is exactly its own second-order series: the valid band must fill the domain.
  await page.selectOption('#op-fn', 'square');
  await setRange(page, '#op-order', 2);
  await page.waitForTimeout(60);
  text = await page.locator('#op-taylor-readout').innerText();
  report.check('linearize: x² at order 2 is exact over the whole domain', /x ∈ \[-3\.00, 3\.00\]/.test(text), text.slice(-160));

  // Pendulum: theta_op = 30°, step 10% of mgl.
  await setRange(page, '#pd-theta', 30);
  await setRange(page, '#pd-dt', 10);
  await setRange(page, '#pd-b', 1);
  await page.waitForTimeout(120);
  text = await page.locator('#op-pend-readout').innerText();
  const num = (re) => parseFloat((text.match(re) || [])[1] ?? 'NaN');
  const linSS = 0.1 / Math.cos(Math.PI / 6) * 180 / Math.PI;
  const nlSS = Math.asin(0.6) * 180 / Math.PI - 30;
  const shownLin = num(/linear model\s+([-\d.]+)°/);
  const shownNl = num(/steady Δθ, nonlinear\s+([-\d.]+)°/);
  report.check(`linearize: linear steady state ΔT/(mgℓ cos θop) = ${linSS.toFixed(3)}°`, near(shownLin, linSS, 0.002), `shown ${shownLin}`);
  report.check(`linearize: nonlinear steady state asin(0.6) − 30° = ${nlSS.toFixed(3)}°`, near(shownNl, nlSS, 0.002), `shown ${shownNl}`);
  const simNl = num(/nonlinear ([-\d.]+)° · linear/);
  const simLi = num(/· linear ([-\d.]+)°/);
  report.check('linearize: RK4 nonlinear simulation settles on the closed-form steady state', near(simNl, nlSS, 0.01), `sim ${simNl}`);
  report.check('linearize: RK4 linear simulation settles on the closed-form steady state', near(simLi, linSS, 0.01), `sim ${simLi}`);
  await shoot(page, 'linearize-small-step');

  const gap = async () => { const t = await page.locator('#op-pend-readout').innerText(); return parseFloat((t.match(/largest gap between the two\s+([\d.]+)/) || [])[1]); };
  await page.click('button[data-pd="30,5,1"]');
  await page.waitForTimeout(100);
  const small = await gap();
  await page.click('button[data-pd="30,40,1"]');
  await page.waitForTimeout(100);
  const large = await gap();
  report.check('linearize: a larger step gives a larger nonlinear/linear gap', large > 4 * small, `${small}° → ${large}°`);

  await page.click('button[data-pd="60,60,1"]');
  await page.waitForTimeout(100);
  text = await page.locator('#op-pend-readout').innerText();
  report.check('linearize: torque beyond mgℓ reports no equilibrium', /no equilibrium/.test(text));
  await shoot(page, 'linearize-no-equilibrium');

  report.check('linearize: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */

/**
 * Concept notes: catch the silent rendering failures.
 *
 * A malformed display-math block does not fail the build. KaTeX renders a red
 * error and remark emits every following line as raw markdown, so the page
 * still builds, still looks like a page, and is missing half its content. That
 * happened to five of nine notes and nothing reported it.
 */
async function checkNotes(browser, origin, report, noteIds) {
  if (noteIds.length === 0) {
    report.check('notes: none published', true, 'nothing to check');
    return;
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  for (const id of noteIds) {
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await page.goto(`${origin}/concepts/${id}/`, { waitUntil: 'networkidle' });

    const state = await page.evaluate(() => {
      const article = document.querySelector('article');
      const html = article ? article.innerHTML : '';
      const text = article ? article.innerText : '';
      // textContent sees content innerText hides; raw markdown can land in both.
      const textAll = article ? article.textContent : '';
      return {
        // KaTeX marks a failed expression with .katex-error. Do NOT look for
        // the inline colour: the browser re-serialises style="color:#cc0000"
        // as rgb(204, 0, 0) in innerHTML, so a hex match silently never fires.
        katexErrors: article ? article.querySelectorAll('.katex-error').length : 1,
        literalWikilinks: (textAll.match(/\[\[[^\]]+\]\]/g) || []).length,
        rawMath: (textAll.match(/\$\$/g) || []).length,
        rawEmphasis: (text.match(/(^|\s)\*[A-Za-z][^*]*\*/g) || []).length,
        wikilinks: document.querySelectorAll('a.wikilink').length,
        words: text.split(/\s+/).filter(Boolean).length,
        katexRendered: document.querySelectorAll('.katex').length,
      };
    });

    report.check(`note ${id}: no KaTeX render errors`, state.katexErrors === 0,
                 `${state.katexErrors} red error span(s)`);
    report.check(`note ${id}: wikilinks resolved`, state.literalWikilinks === 0,
                 `${state.literalWikilinks} left as literal [[...]]`);
    report.check(`note ${id}: no unrendered $$ math`, state.rawMath === 0,
                 `${state.rawMath} raw delimiter(s) in visible text`);
    report.check(`note ${id}: no raw markdown leaked`, state.rawEmphasis === 0,
                 `${state.rawEmphasis} unrendered *emphasis* span(s)`);
    report.check(`note ${id}: has substantive content`, state.words > 120,
                 `${state.words} words, ${state.katexRendered} rendered formulas`);
    report.check(`note ${id}: no console errors`, errors.length === 0, errors.join(' | '));
    await page.close();
  }
  await ctx.close();
}

async function checkResponsiveAndThemes(browser, origin, report) {
  const pages = [
    '/interactives/',
    '/interactives/eigenvector-geometry/',
    '/interactives/modal-decomposition/',
    '/interactives/second-order-response/',
    '/interactives/diagram-decomposition/',
    '/interactives/physical-active-feedback/',
    '/interactives/operating-point-linearization/',
    '/interactives/dynamic-stiffness/',
    '/interactives/voltage-source-stiffness/',
    '/interactives/eigenvalue-migration/',
    '/interactives/motor-transfer-matrix/',
    '/interactives/motor-state-feedback/',
    '/interactives/decoupling-derivation/',
    '/interactives/motion-stiffness-tuning/',
    '/interactives/motion-command-paths/',
    '/interactives/resonant-load/',
    '/interactives/stiffness-bandwidth/',
  ];

  // Phone width: nothing may scroll sideways.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  for (const route of pages) {
    const page = await phone.newPage();
    const errors = watchErrors(page);
    await page.goto(origin + route, { waitUntil: 'networkidle' });
    const { overflow, scrollWidth, clientWidth } = await horizontalOverflow(page);
    report.check(`mobile 390px: no sideways scroll on ${route}`, overflow <= 1,
                 `scrollWidth ${scrollWidth} vs clientWidth ${clientWidth}`);
    report.check(`mobile 390px: no console errors on ${route}`, errors.length === 0,
                 errors.join(' | '));
    if (route.includes('eigenvector')) await shoot(page, 'mobile-geometry');
    if (route.includes('diagram-decomposition')) await shoot(page, 'mobile-decomp');
    await page.close();
  }
  await phone.close();

  // Both themes must actually render, and differently.
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto(`${origin}/interactives/eigenvector-geometry/`, { waitUntil: 'networkidle' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const ink = await canvasInk(page, '#eig-canvas');
    report.check(`${scheme} theme: canvas renders`, ink.painted > 500, `${ink.painted} painted`);
    report.check(`${scheme} theme: body background set`, bg && bg !== 'rgba(0, 0, 0, 0)', bg);
    await shoot(page, `theme-${scheme}`);
    await ctx.close();
  }
}


/* ------------------------------------------------------------------ */
/* Week 3: disturbance rejection.                                      */
/*                                                                     */
/* Every expected value below is derived here from the slider settings */
/* and the physics, not read back from the page, so a wrong formula in */
/* a component fails rather than being confirmed by itself.            */

/** The components' number formatter, so expected values can be matched as text. */
function sig(x, d = 3) {
  if (!isFinite(x)) return '—';
  if (x !== 0 && (Math.abs(x) >= 1e4 || Math.abs(x) < 1e-2)) return x.toExponential(d - 1);
  return String(Number(x.toPrecision(d)));
}

async function checkDynamicStiffness(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/dynamic-stiffness/`, { waitUntil: 'networkidle' });

  for (const sel of ['#ds-frf', '#ds-step']) {
    const ink = await canvasInk(page, sel);
    report.check(`stiffness: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const span = await coloredInkSpan(page, '#ds-frf');
  report.check('stiffness: DS curve spans the plot width', span.span > 0.7,
               `${(span.span * 100).toFixed(0)}%`);

  // Defaults: Rp = 1e-1, Lp = 1e-3, Ra = 1, La = 0.
  let Rp = 0.1, Lp = 1e-3, Ra = 1, La = 0;
  let text = await page.locator('#ds-readout').innerText();
  const corner = (R, L) => R / (2 * Math.PI * L);
  report.check('stiffness: corner is (Rp+Ra)/(2π(Lp+La))',
               text.includes(sig(corner(Rp + Ra, Lp + La))), text.slice(0, 220));
  report.check('stiffness: passive corner is Rp/(2πLp)',
               text.includes(sig(corner(Rp, Lp))), text.slice(0, 220));
  report.check('stiffness: DC stiffness is Rp+Ra', text.includes(sig(Rp + Ra)));
  report.check('stiffness: |DS| at the corner is √2·(Rp+Ra)',
               text.includes(sig(Math.SQRT2 * (Rp + Ra))), text.slice(0, 320));
  report.check('stiffness: closed form and RK4 agree', /the two agree/.test(text),
               text.slice(text.indexOf('closed form'), text.indexOf('closed form') + 120));

  // Passive only: the active corner must collapse onto the physical one.
  await page.click('button[data-ra="0"][data-la="0"]');
  await page.waitForTimeout(80);
  text = await page.locator('#ds-readout').innerText();
  report.check('stiffness: with no active gains the two corners coincide',
               (text.match(new RegExp(sig(corner(Rp, Lp)).replace('.', '\\.'), 'g')) || []).length >= 2,
               text.slice(0, 260));
  report.check('stiffness: passive-only lift is ×1', /×1\b/.test(text), text.slice(0, 260));
  await shoot(page, 'stiffness-passive');

  // An active inductance moves the corner DOWN (it divides), which is the
  // detail the lecture's fb_active formula leaves out by holding La at zero.
  await page.click('button[data-ra="3"][data-la="6"]');
  await page.waitForTimeout(80);
  Ra = 3; La = 6e-3;
  text = await page.locator('#ds-readout').innerText();
  report.check('stiffness: corner follows the total inductance too',
               text.includes(sig(corner(Rp + Ra, Lp + La))), text.slice(0, 260));
  report.check('stiffness: lift is (Rp+Ra)/Rp', text.includes(`×${sig((Rp + Ra) / Rp)}`),
               text.slice(0, 260));

  report.check('stiffness: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkVoltageSourceStiffness(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/voltage-source-stiffness/`, { waitUntil: 'networkidle' });

  for (const sel of ['#vs-frf', '#vs-step']) {
    const ink = await canvasInk(page, sel);
    report.check(`notch: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const span = await coloredInkSpan(page, '#vs-frf');
  report.check('notch: DS curve spans the plot width', span.span > 0.7,
               `${(span.span * 100).toFixed(0)}%`);

  // Defaults: Rp = 1e-1, Lp = 1e-3, Cp = 10^-4.6.
  const Lp = 1e-3, Cp = Math.pow(10, -4.6);
  let Rp = 0.1;
  const wn = 1 / Math.sqrt(Lp * Cp);
  let text = await page.locator('#vs-readout').innerText();
  report.check('notch: fr = 1/(2π√(LpCp))', text.includes(sig(wn / (2 * Math.PI))),
               text.slice(0, 200));
  report.check('notch: ωn = 1/√(LpCp)', text.includes(sig(wn)));
  report.check('notch: ζ = (Rp/2)√(Cp/Lp)',
               text.includes(sig((Rp / 2) * Math.sqrt(Cp / Lp))), text.slice(0, 260));
  report.check('notch: fb = Rp/(2πLp)', text.includes(sig(Rp / (2 * Math.PI * Lp))));
  report.check('notch: sag is −Rp per amp', text.includes(sig(-Rp)), text.slice(0, 400));
  report.check('notch: underdamped default shows an open notch',
               /the notch is open/.test(text), text.slice(0, 260));

  // The rational form the lecture writes must match the numeric circuit solve.
  const dev = text.match(/max deviation\s+([\d.]+e[-+]?\d+)/);
  report.check('notch: rational DS matches an independent circuit solve',
               dev !== null && parseFloat(dev[1]) < 1e-9, dev ? dev[1] : text.slice(0, 200));
  report.check('notch: closed form and RK4 agree', /the two agree/.test(text),
               text.slice(text.indexOf('closed form'), text.indexOf('closed form') + 120));
  await shoot(page, 'notch-underdamped');

  // Rp alone does not get there: at the default Cp, Rp = 10 Ω is still only
  // ζ = 0.79. Raising Cp as well pushes ζ past 1, and then the notch must be
  // reported as gone rather than drawn -- the case a hard-coded "there is a
  // notch" implementation gets wrong.
  await page.click('button[data-rp="1"]');
  await page.waitForTimeout(80);
  Rp = 10;
  text = await page.locator('#vs-readout').innerText();
  report.check('notch: ζ recomputed for the new Rp',
               text.includes(sig((Rp / 2) * Math.sqrt(Cp / Lp))), text.slice(0, 260));
  report.check('notch: Rp = 10 Ω alone is still underdamped',
               (Rp / 2) * Math.sqrt(Cp / Lp) < 1 && /the notch is open/.test(text),
               text.slice(0, 260));

  const cpHigh = Math.pow(10, -3.3);
  await setRange(page, '#vs-cp', -3.3);
  await page.waitForTimeout(80);
  const zetaHigh = (Rp / 2) * Math.sqrt(cpHigh / Lp);
  report.check('notch: this setting really is overdamped', zetaHigh >= 1, `ζ = ${zetaHigh}`);
  text = await page.locator('#vs-readout').innerText();
  report.check('notch: ζ ≥ 1 reported as overdamped, no notch',
               /overdamped — no notch/.test(text), text.slice(0, 300));
  report.check('notch: overdamped case reports no ringing',
               /overdamped and the notch is gone/.test(text), text.slice(0, 500));
  report.check('notch: ζ recomputed for the new Cp', text.includes(sig(zetaHigh)),
               text.slice(0, 260));
  await shoot(page, 'notch-overdamped');

  report.check('notch: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkEigenvalueMigration(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/eigenvalue-migration/`, { waitUntil: 'networkidle' });

  for (const sel of ['#evm-splane', '#evm-step']) {
    const ink = await canvasInk(page, sel);
    report.check(`migration: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }

  // Defaults: Rp = 1e-1, Lp = 1e-3, Cp = 10^-4.6, Req = 10.
  const Rp = 0.1, Lp = 1e-3, Cp = Math.pow(10, -4.6), Req = 10;
  const tr = -(1 / (Req * Cp) + Rp / Lp);
  const det = (1 / (Lp * Cp)) * (1 + Rp / Req);
  const disc = (tr * tr) / 4 - det;
  report.check('migration: default load gives a complex pair', disc < 0, `disc = ${disc}`);
  const re = tr / 2, im = Math.sqrt(-disc);

  let text = await page.locator('#evm-readout').innerText();
  report.check('migration: eigenvalues match λ = tr/2 ± √(tr²/4 − det)',
               text.includes(`${sig(re)} ± ${sig(im)}j`), text.slice(0, 260));
  report.check('migration: DC gain is the resistive divider Req/(Req+Rp)',
               text.includes(sig(Req / (Req + Rp))), text.slice(0, 400));
  const resid = text.match(/worst\s+([\d.]+e[-+]?\d+)/);
  report.check('migration: every swept root satisfies the characteristic equation',
               resid !== null && parseFloat(resid[1]) < 1e-8,
               resid ? resid[1] : text.slice(0, 200));
  report.check('migration: closed form and RK4 agree', /the two agree/.test(text),
               text.slice(text.indexOf('closed form'), text.indexOf('closed form') + 120));
  await shoot(page, 'migration-evm');

  // A heavy load must drive the pair onto the real axis -- the whole point of
  // the plot is that the load changes the character of the response.
  await setRange(page, '#evm-req', -0.5);
  await page.waitForTimeout(80);
  text = await page.locator('#evm-readout').innerText();
  report.check('migration: a heavy load makes the roots real',
               /real — overdamped/.test(text), text.slice(0, 260));

  // Root-locus mode is a different system and must say so.
  await page.selectOption('#evm-mode', 'locus');
  await page.waitForTimeout(120);
  text = await page.locator('#evm-readout').innerText();
  report.check('migration: locus mode names it as not the power supply',
               /not the power supply/.test(text), text.slice(0, 260));
  // a = 20, b = 50, K = 200 -> s^2 + 20 s + 250 -> -10 ± j√150
  report.check('migration: closed-loop roots at K = 200',
               text.includes(`${sig(-10)} ± ${sig(Math.sqrt(250 - 100))}j`), text.slice(0, 260));
  report.check('migration: breakaway at K = a²/4 − b', text.includes('K = 50'),
               text.slice(0, 400));
  const locusInk = await canvasInk(page, '#evm-splane');
  report.check('migration: locus mode redraws the s-plane', locusInk.painted > 400,
               `${locusInk.painted} painted`);
  report.check('migration: supply sliders hidden in locus mode',
               await page.locator('#evm-supply-params').isHidden());
  await shoot(page, 'migration-locus');

  report.check('migration: no console errors', errors.length === 0, errors.join(' | '));
}


/* ------------------------------------------------------------------ */
/* Week 4: the DC motor and its state feedback.                        */

/** Motor at the component defaults, from the slider positions. */
const MOTOR = {
  Rp: Math.pow(10, -0.301), Lp: 1e-3, J: 1e-4, bp: 1e-5, K: Math.pow(10, -0.02),
};

async function checkMotorTransferMatrix(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/motor-transfer-matrix/`, { waitUntil: 'networkidle' });

  for (const sel of ['#mtm-frf', '#mtm-zeros']) {
    const ink = await canvasInk(page, sel);
    report.check(`motor: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const span = await coloredInkSpan(page, '#mtm-frf');
  report.check('motor: stiffness curve spans the plot width', span.span > 0.7,
               `${(span.span * 100).toFixed(0)}%`);

  const { Rp, Lp, J, bp, K } = MOTOR;
  // D(s) = J Lp s^2 + (Lp bp + J Rp) s + Ke Kt + Rp bp, monic coefficients.
  const b1 = (Lp * bp + J * Rp) / (J * Lp);
  const b0 = (K * K + Rp * bp) / (J * Lp);
  const wn = Math.sqrt(b0);
  const fr = wn / (2 * Math.PI);
  const disc = (b1 / 2) * (b1 / 2) - b0;
  const rpEqual = (Lp * bp + 2 * Math.sqrt(J * Lp * K * K)) / J;

  let text = await page.locator('#mtm-readout').innerText();
  // The lecture's own worked example: fr = 480.61 Hz, zeros -250.05 +/- 3009i.
  report.check('motor: fr matches the lecture example (~480.6 Hz)',
               Math.abs(fr - 480.61) < 0.5, `computed ${fr}`);
  report.check('motor: fr shown', text.includes(sig(fr)), text.slice(0, 260));
  report.check('motor: default zeros are a complex pair', disc < 0, `disc = ${disc}`);
  report.check('motor: zeros match −b1/2 ± √(b0 − b1²/4)',
               text.includes(`${sig(-b1 / 2)} ± ${sig(Math.sqrt(-disc))}j`), text.slice(0, 300));
  report.check('motor: zeros match the lecture (−250.05 ± 3009i)',
               Math.abs(-b1 / 2 + 250.05) < 0.5 && Math.abs(Math.sqrt(-disc) - 3009) < 5,
               `${-b1 / 2} ± ${Math.sqrt(-disc)}j`);
  report.check('motor: Rp for equal roots shown', text.includes(sig(rpEqual)),
               text.slice(0, 400));
  report.check('motor: V/Ω reported as having no poles', /a polynomial/.test(text),
               text.slice(0, 400));
  report.check('motor: substitution and (sI−A)⁻¹B agree', (() => {
    const d = text.match(/max deviation\s+([\d.]+e[-+]?\d+)/);
    return d !== null && parseFloat(d[1]) < 1e-9;
  })(), text.slice(text.indexOf('substitution'), text.indexOf('substitution') + 140));
  await shoot(page, 'motor-complex-zeros');

  // Driving Rp to the equal-root value must close the notch. No stepped slider
  // lands on a double root exactly, so the tool reports the 1% band -- that is
  // the claim being checked, not exact equality.
  await page.click('button[data-rp="equal"]');
  await page.waitForTimeout(80);
  text = await page.locator('#mtm-readout').innerText();
  report.check('motor: equal-roots preset closes the notch',
               /real and equal/.test(text), text.slice(0, 300));

  await page.click('button[data-rp="2"]');
  await page.waitForTimeout(80);
  text = await page.locator('#mtm-readout').innerText();
  report.check('motor: Rp = 100 Ω gives two separate real zeros',
               /real and far apart/.test(text), text.slice(0, 300));
  const RpFar = 100;
  const far1 = (Lp * bp + J * RpFar) / (J * Lp);
  const far0 = (K * K + RpFar * bp) / (J * Lp);
  const root = Math.sqrt((far1 / 2) * (far1 / 2) - far0);
  report.check('motor: far-apart zeros match the quadratic',
               text.includes(sig(-far1 / 2 + root)) && text.includes(sig(-far1 / 2 - root)),
               text.slice(0, 300));

  // Load-torque mode: DC stiffness is KtKe/Rp + bp and there is one pole.
  await page.click('button[data-rp="-0.301"]');
  await page.selectOption('#mtm-mode', 'torque');
  await page.waitForTimeout(120);
  text = await page.locator('#mtm-readout').innerText();
  report.check('motor: torque-mode DC stiffness is KtKe/Rp + bp',
               text.includes(sig(K * K / Rp + bp)), text.slice(0, 400));
  report.check('motor: torque-mode pole is −Rp/Lp', text.includes(sig(-Rp / Lp)),
               text.slice(0, 400));
  report.check('motor: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkMotorStateFeedback(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/motor-state-feedback/`, { waitUntil: 'networkidle' });

  for (const sel of ['#msf-frf', '#msf-all']) {
    const ink = await canvasInk(page, sel);
    report.check(`feedback-mod: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }

  const { Rp, Lp, J, bp, K } = MOTOR;
  const Ra = Math.pow(10, 0.699);
  const dcFor = (Reff, Keff) => K * Keff / Reff + bp;
  const dcBase = dcFor(Rp, K);

  // Default is case 3 with exact cancellation: Reff = Ra, Keff = 0, so the DC
  // stiffness is bearing drag alone -- slide 17's "much worse".
  let text = await page.locator('#msf-readout').innerText();
  report.check('feedback-mod: case 3 leaves Reff = Ra', text.includes(sig(Ra)),
               text.slice(0, 300));
  report.check('feedback-mod: case 3 DC stiffness collapses to bp',
               text.includes(sig(bp)) && /much worse/.test(text), text.slice(0, 600));
  report.check('feedback-mod: unmodified DC stiffness is KtKe/Rp + bp',
               text.includes(sig(dcBase)), text.slice(0, 600));
  report.check('feedback-mod: the ratio between them is reported',
               text.includes(sig(dcBase / bp)), text.slice(0, 600));
  report.check('feedback-mod: speed droop for a 0.01 N·m step',
               text.includes(sig(0.01 / bp)) && text.includes(sig(0.01 / dcBase)),
               text.slice(0, 800));
  report.check('feedback-mod: current-loop bandwidth is Ra/(2π Lp)',
               text.includes(sig(Ra / (2 * Math.PI * Lp))), text.slice(0, 900));
  report.check('feedback-mod: pole/zero cancellation reported',
               /pole cancels/.test(text), text.slice(0, 900));
  report.check('feedback-mod: default is stable', /stable/.test(text) && !/UNSTABLE/.test(text),
               text.slice(0, 900));
  report.check('feedback-mod: closed form matches the state-equation solve', (() => {
    const d = text.match(/max deviation\s+([\d.]+e[-+]?\d+)/);
    return d !== null && parseFloat(d[1]) < 1e-9;
  })(), text.slice(0, 900));
  await shoot(page, 'feedback-mod-case3');

  // Case 1 must land on exactly the same stiffness as case 3: Keff = 0 either
  // way, so the numerator factors and the pole cancels. That is slide 21.
  await page.selectOption('#msf-case', '1');
  await page.waitForTimeout(120);
  text = await page.locator('#msf-readout').innerText();
  report.check('feedback-mod: case 1 also collapses to bp at DC',
               text.includes(sig(bp)) && /pole cancels/.test(text), text.slice(0, 600));
  report.check('feedback-mod: case 1 leaves Reff = Rp', text.includes(sig(Rp)),
               text.slice(0, 300));
  report.check('feedback-mod: controller gains hidden in case 1 is false',
               !(await page.locator('#msf-controller').isHidden()), 'Ke_hat still applies');

  // Case 0 must be the unmodified motor.
  await page.selectOption('#msf-case', '0');
  await page.waitForTimeout(120);
  text = await page.locator('#msf-readout').innerText();
  report.check('feedback-mod: case 0 is unchanged from the bare motor',
               /unchanged/.test(text) && text.includes(sig(dcBase)), text.slice(0, 600));
  report.check('feedback-mod: controller box hidden in case 0',
               await page.locator('#msf-controller').isHidden());

  // Case 2 keeps back-EMF but moves it to Ra: stiffness falls by Ra/Rp.
  await page.selectOption('#msf-case', '2');
  await page.waitForTimeout(120);
  text = await page.locator('#msf-readout').innerText();
  report.check('feedback-mod: case 2 DC stiffness is KtKe/Ra + bp',
               text.includes(sig(dcFor(Ra, K))), text.slice(0, 600));
  report.check('feedback-mod: case 2 is worse by about Ra/Rp',
               Math.abs((dcBase / dcFor(Ra, K)) / (Ra / Rp) - 1) < 0.01,
               `${dcBase / dcFor(Ra, K)} vs ${Ra / Rp}`);

  // Over-cancelling the winding resistance must be reported as unstable.
  await page.selectOption('#msf-case', '3');
  await setRange(page, '#msf-rhat', 1.3);
  await setRange(page, '#msf-ra', -1.3);
  await page.waitForTimeout(120);
  const Reff = Rp - 1.3 * Rp + Math.pow(10, -1.3);
  report.check('feedback-mod: this setting really does drive Reff negative', Reff < 0,
               `Reff = ${Reff}`);
  text = await page.locator('#msf-readout').innerText();
  report.check('feedback-mod: negative Reff reported as unstable', /UNSTABLE/.test(text),
               text.slice(0, 900));
  await shoot(page, 'feedback-mod-unstable');

  report.check('feedback-mod: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Weeks 5 and 6: decoupling, virtual zero references, current loops.  */
/* Expected values are again computed here, not read back.             */

/**
 * The derivation walkthrough. Its numbers are plain text for exactly this
 * purpose: every value asserted below is recomputed here by a route the page
 * does not use (Cramer's rule for the solve, a written-out product for the
 * multiply-back), from slider values chosen here rather than the defaults.
 */
async function checkDecouplingDerivation(page, origin, report) {
  const errors = watchErrors(page);
  const url = `${origin}/interactives/decoupling-derivation/`;
  await page.goto(url, { waitUntil: 'networkidle' });

  const f3 = (x) => { const r = Math.round(x * 1000) / 1000; return r === 0 ? '0' : String(r).replace('-', '−'); };
  const text = async (sel) => (await page.locator(sel).innerText()).replace(/\s+/g, ' ');
  const steps = () => page.locator('.dv-step:visible').count();
  const slot = (scope, key) => page.locator(`${scope} [data-val="${key}"]`).first().textContent();
  const next = async () => { await page.click('#dv-next'); await page.waitForTimeout(60); };

  report.check('derivation: opens on step 1 alone', await steps() === 1, `${await steps()} step(s) visible`);

  /* step 1: what the bar gets from two chosen forces */
  const L = 2.6, F1 = -3.4, F2 = 7.1, a = L / 2;
  await setRange(page, '#dv-l', L);
  await setRange(page, '#dv-f1', F1);
  await setRange(page, '#dv-f2', F2);
  const F = F1 + F2, T = a * F1 - a * F2;
  let t = await text('#dv-r1');
  report.check('derivation: net force and torque match F1 + F2 and (L/2)(F1 − F2)',
               t.includes(`= ${f3(F)} N`) && t.includes(`= ${f3(T)} N·m`), `expect ${f3(F)} N, ${f3(T)} N·m | ${t}`);
  report.check('derivation: the bar prints the same two numbers as the readout',
               await slot('#dv-bar1', 'F') === `${f3(F)} N` && await slot('#dv-bar1', 'T') === `${f3(T)} N·m`,
               `${await slot('#dv-bar1', 'F')}, ${await slot('#dv-bar1', 'T')}`);
  // A negative force has to be drawn pointing down and a positive one up, or
  // the picture contradicts the sign convention printed in its corner.
  const tipBelowTail = async (key) => {
    const pts = (await page.locator(`#dv-bar1 [data-k="${key}"]`).getAttribute('points')).split(' ')
      .map((q) => parseFloat(q.split(',')[1]));
    return pts[1] > pts[0];
  };
  report.check('derivation: a negative force points down and a positive one up',
               await tipBelowTail('f1') === true && await tipBelowTail('f2') === false);

  // The hand challenge: F = 6 N, T = 3 N·m means F1 = 3 + 3/L, F2 = 3 − 3/L.
  for (const len of [2, 3.3]) {
    await setRange(page, '#dv-l', len);
    await setRange(page, '#dv-f1', (3 + 3 / len).toFixed(1));
    await setRange(page, '#dv-f2', (3 - 3 / len).toFixed(1));
    t = await text('#dv-ch');
    report.check(`derivation: the hand challenge is solvable and recognised at L = ${len} m`, /Got it/.test(t), t.slice(0, 80));
  }
  await setRange(page, '#dv-f1', 1);
  t = await text('#dv-ch');
  report.check('derivation: off target, the challenge says which way', /too low/.test(t) && !/Got it/.test(t), t);
  await shoot(page, 'derivation-step1');

  /* step 2: the fill-in diagnoses the slip rather than just refusing it */
  await setRange(page, '#dv-l', L);
  await setRange(page, '#dv-f1', F1);
  await setRange(page, '#dv-f2', F2);
  await next();
  const fill = async (b11, b12, b21, b22) => {
    for (const [cell, v] of [['b11', b11], ['b12', b12], ['b21', b21], ['b22', b22]]) {
      await page.selectOption(`.dv-fill select[data-cell="${cell}"]`, v);
    }
    await page.click('#dv-check');
    return text('#dv-fb');
  };
  t = await fill('1', '1', 'L/2', 'L/2');
  report.check('derivation: a missing minus sign in B is named as a sign slip',
               /wrong sign/.test(t) && await page.locator('#dv-after2').isHidden(), t);
  t = await fill('1', 'L/2', '1', '-L/2');
  report.check('derivation: a transposed B is named as rows and columns swapped', /rows and columns swapped/.test(t), t);
  t = await fill('1', '1', '1/L', '-L/2');
  report.check('derivation: 1/L in B is pointed at step 3', /step 3/.test(t), t);
  t = await fill('1', '1', 'L/2', '-L/2');
  report.check('derivation: the right four entries are accepted and B is shown',
               /Correct/.test(t) && await page.locator('#dv-after2').isVisible(), t);
  t = await text('#dv-n2');
  report.check('derivation: B with numbers in it reproduces F and T',
               [F, T, a, -a, F1, F2].every((v) => t.includes(f3(v))), t);

  /* step 3: solve for the actuator forces; expected by Cramer's rule */
  await next();
  const Fc = -5, Tc = 7.5;
  await setRange(page, '#dv-fc', Fc);
  await setRange(page, '#dv-tc', Tc);
  const det = 1 * -a - 1 * a;
  const F1c = (Fc * -a - 1 * Tc) / det, F2c = (1 * Tc - a * Fc) / det;
  report.check('derivation: step 3 starts with the two equations only',
               await page.locator('#dv-l3 > li:visible').count() === 2 && await page.locator('#dv-after3').isHidden());
  for (let i = 0; i < 4; i++) await page.click('#dv-more3 button');
  report.check('derivation: four clicks reveal the rest of the elimination',
               await page.locator('#dv-l3 > li:visible').count() === 6 && await page.locator('#dv-more3').isHidden()
               && await page.locator('#dv-after3').isVisible());
  t = await text('#dv-l3');
  report.check('derivation: the eliminated F1 and F2 match Cramer\'s rule',
               t.includes(`F₁ = ${f3(F1c)} N`) && t.includes(`F₂ = ${f3(F2c)} N`),
               `expect ${f3(F1c)}, ${f3(F2c)} | ${t.slice(-260)}`);
  t = await text('#dv-r3');
  report.check('derivation: putting them back returns the commands, and the two routes agree',
               t.includes(`= ${f3(Fc)} N`) && t.includes(`= ${f3(Tc)} N·m`) && /the two agree/.test(t), t);
  report.check('derivation: the step 3 bar carries the solved forces',
               await slot('#dv-bar2', 'F1') === `${f3(F1c)} N` && await slot('#dv-bar2', 'F2') === `${f3(F2c)} N`
               && await slot('#dv-bar2', 'T') === `${f3(Tc)} N·m`);

  /* step 4: the recipe, then B times each candidate */
  await next();
  for (let i = 0; i < 3; i++) await page.click('#dv-more4 button');
  t = await text('#dv-l4 [data-n="2"]');
  report.check('derivation: the determinant is −L', t.trim().endsWith(`= ${f3(-L)}`), t);
  const product = async () => (await page.locator('#dv-prod .dv-mat').nth(2).locator('span').allInnerTexts()).map((s) => s.trim());
  const B = [[1, 1], [a, -a]];
  const times = (C) => [0, 1].flatMap((r) => [0, 1].map((c) => f3(B[r][0] * C[0][c] + B[r][1] * C[1][c])));
  const cases = [
    ['inv', [[0.5, 1 / L], [0.5, -1 / L]], /Identity/],
    ['arm', [[0.5, a], [0.5, -a]], /Diagonal, but not identity/],
    ['sign', [[0.5, 1 / L], [0.5, 1 / L]], /Not diagonal/],
    ['none', [[1, 0], [0, 1]], /just B again/],
  ];
  for (const [name, C, verdict] of cases) {
    await page.check(`input[name="dv-cand"][value="${name}"]`);
    const got = await product(), want = times(C);
    t = await text('#dv-verdict');
    report.check(`derivation: B × candidate "${name}" is the product computed here, with the right verdict`,
                 got.join(',') === want.join(',') && verdict.test(t), `got ${got} want ${want} | ${t.slice(0, 70)}`);
  }
  await page.check('input[name="dv-cand"][value="arm"]');
  t = await text('#dv-verdict');
  report.check('derivation: L/2 for 1/L is reported as a torque gain of L²/2', t.includes(`multiplied by ${f3(L * L / 2)}`), t);
  await page.check('input[name="dv-cand"][value="inv"]');
  report.check('derivation: the recipe agrees with elimination on the numbers', /the two agree/.test(await text('#dv-r4')));
  await setRange(page, '#dv-l2', 1.4);
  report.check('derivation: the second L slider is the same L',
               await page.inputValue('#dv-l') === '1.4' && await slot('#dv-bar1', 'L') === 'L = 1.40 m');
  await setRange(page, '#dv-l2', L);

  /* step 5: the same numbers on the wires */
  await next();
  report.check('derivation: the fifth step is the last', await steps() === 5 && /all 5 steps/.test(await text('#dv-where'))
               && await page.locator('#dv-next').isDisabled());
  const wires = async (scope) => Promise.all(['Fc', 'Tc', 'w12', 'F1', 'F2', 'wb21', 'F', 'T'].map((key) => slot(scope, key)));
  const expectWires = (fc, tc) => {
    const f1 = fc / 2 + tc / L, f2 = fc / 2 - tc / L;
    return [`${f3(fc)} N`, `${f3(tc)} N·m`, `${f3(tc / L)} N`, `${f3(f1)} N`, `${f3(f2)} N`,
            `${f3(a * f1)} N·m`, `${f3(f1 + f2)} N`, `${f3(a * f1 - a * f2)} N·m`];
  };
  report.check('derivation: every wire of the diagram carries the value computed here',
               (await wires('#dv-fig-full')).join('|') === expectWires(Fc, Tc).join('|'),
               `${await wires('#dv-fig-full')} vs ${expectWires(Fc, Tc)}`);

  await page.click('#dv-null button:nth-child(1)');
  t = await text('#dv-null5');
  report.check('derivation: a force command alone leaves the torque at zero',
               /force command alone/.test(t) && await slot('#dv-fig-full', 'T') === '0 N·m'
               && await slot('#dv-fig-full', 'F1') === await slot('#dv-fig-full', 'F2'), t);
  await page.click('#dv-null button:nth-child(2)');
  t = await text('#dv-null5');
  report.check('derivation: a torque command alone leaves the force at zero',
               /torque command alone/.test(t) && await slot('#dv-fig-full', 'F') === '0 N'
               && await page.inputValue('#dv-fc') === '0', t);

  await page.click('#dv-null button:nth-child(3)');
  await page.check('#dv-shared');
  report.check('derivation: sharing the equal gains swaps the drawing and not the numbers',
               await page.locator('#dv-fig-full').isHidden() && await page.locator('#dv-fig-shared').isVisible()
               && (await wires('#dv-fig-shared')).join('|') === expectWires(8, 4).join('|'));
  await page.locator('#step-5 .katex [data-sym^="m21"]').hover();
  const sharedLit = await page.locator('#dv-fig-shared .dd-el.is-hot').count();
  await page.locator('#dv-fig-shared .dd-el[data-sym^="h "]').hover();
  const bothCells = await page.locator('#step-5 .katex [data-sym^="m11"].is-hot').count()
    + await page.locator('#step-5 .katex [data-sym^="m21"].is-hot').count();
  report.check('derivation: an entry lights its shared block, and the shared block lights both its entries',
               sharedLit >= 1 && bothCells === 2, `block ${sharedLit}, cells ${bothCells}`);
  await page.uncheck('#dv-shared');
  await page.locator('#step-5 .katex [data-sym^="m22"]').hover();
  const oneBlock = await page.locator('#dv-fig-full rect.dd-block').evaluateAll((els) =>
    els.filter((el) => el.closest('.is-hot')).length);
  report.check('derivation: with one block per entry, an entry lights exactly its own block', oneBlock === 1, `${oneBlock} lit`);
  await page.mouse.move(0, 0);

  // The correspondence checks every figure on the site gets, with all of the
  // walkthrough open: each slider symbol is drawn, and no value slot is empty.
  const survey = await page.evaluate(() => {
    const visible = (el) => !!(el.getBoundingClientRect().width || el.getBoundingClientRect().height);
    const keys = (el) => (el.getAttribute('data-sym') || '').trim().split(/\s+/).filter(Boolean);
    const figs = [...document.querySelectorAll('.sysfig')].filter(visible);
    const drawn = new Set(figs.flatMap((fig) => [...fig.querySelectorAll('[data-sym]')].flatMap(keys)));
    const empty = figs.flatMap((fig) => [...fig.querySelectorAll('[data-val]')])
      .filter((el) => !(el.textContent || '').trim()).map((el) => el.getAttribute('data-val'));
    const controls = [...document.querySelectorAll('label[data-sym]')].filter(visible).map((el) => keys(el)[0]);
    return { figures: figs.length, undrawn: controls.filter((key) => !drawn.has(key)), empty };
  });
  report.check('derivation: every slider symbol is drawn and every value slot is filled',
               survey.figures === 3 && survey.undrawn.length === 0 && survey.empty.length === 0,
               `${survey.figures} figures | undrawn ${survey.undrawn} | empty ${survey.empty}`);
  await shoot(page, 'derivation-all');

  await page.click('#dv-prev');
  report.check('derivation: back folds the last step away again', await steps() === 4);

  // Phone width with everything open: maths and diagrams scroll in their own
  // boxes, the page itself does not.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}#all`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  const { overflow, scrollWidth, clientWidth } = await horizontalOverflow(page);
  report.check('derivation: #all opens every step, and nothing scrolls sideways at 390px',
               await steps() === 5 && await page.locator('#dv-after2').isVisible() && overflow <= 1,
               `${await steps()} steps, scrollWidth ${scrollWidth} vs ${clientWidth}`);
  await shoot(page, 'derivation-mobile');
  await page.goto(`${url}#step-3`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  report.check('derivation: #step-3 opens the first three steps', await steps() === 3, `${await steps()} visible`);

  report.check('derivation: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkInputDecoupling(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/input-decoupling/`, { waitUntil: 'networkidle' });
  for (const sel of ['#idc-c1', '#idc-c2']) {
    const ink = await canvasInk(page, sel);
    report.check(`decoupling: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#idc-readout').innerText()).replace(/\s+/g, ' ');

  let text = await read();
  report.check('decoupling: ideal case passes the null test and is diagonal',
               /Null test passes/.test(text) && /\bdiagonal\b/.test(text), text.slice(0, 200));
  report.check('decoupling: closed form and RK4 agree', /the two agree/.test(text));

  // Mismatched actuators: T(t) = (L/4)(e^-K2t - e^-K1t), peak at ln(K1/K2)/(K1-K2).
  await page.click('#idc .presets button:nth-child(2)');
  await page.waitForTimeout(80);
  const L = 2, K1 = 10 ** 1.3, K2 = 10 ** 0.6;
  const tp = Math.log(K1 / K2) / (K1 - K2);
  const peak = (L / 4) * Math.abs(Math.exp(-K2 * tp) - Math.exp(-K1 * tp));
  text = await read();
  report.check('decoupling: transient cross-coupling peak matches the closed form',
               text.includes(`${sig(peak)} N·m at t = ${sig(tp)} s`), `expect ${sig(peak)} at ${sig(tp)} | ${text.slice(150, 420)}`);
  const measured = parseFloat((text.match(/\), ([\d.e-]+) N·m in the RK4 trace/) || [])[1] ?? 'NaN');
  report.check('decoupling: RK4 peak within 1% of the closed form',
               Math.abs(measured - peak) < 0.01 * peak, `RK4 ${measured}, exact ${peak}`);
  report.check('decoupling: mismatch fails the null test but stays diagonal at DC',
               /fails during the transient/.test(text) && /\bdiagonal\b/.test(text));
  await shoot(page, 'decoupling-mismatch');

  await page.click('#idc .presets button:nth-child(3)');
  await page.waitForTimeout(80);
  text = await read();
  report.check('decoupling: a short L̂ is a torque gain of L/L̂, not a coupling',
               text.includes(`×${sig(1 / 0.8)}`) && /Null test passes/.test(text), text.slice(-200));

  await page.click('#idc .presets button:nth-child(4)');
  await page.waitForTimeout(80);
  text = await read();
  report.check('decoupling: without B̂⁻¹ the map is cross-coupled',
               /cross-coupled/.test(text) && !/Null test passes/.test(text), text.slice(0, 220));
  const greyed = await page.locator('#idc .sysfig .is-off').count();
  report.check('decoupling: the bypassed block greys out', greyed > 0, `${greyed} greyed`);
  await shoot(page, 'decoupling-off');
  report.check('decoupling: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkDisturbanceDecoupling(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/disturbance-decoupling/`, { waitUntil: 'networkidle' });
  for (const sel of ['#did-inv', '#did-sim']) {
    const ink = await canvasInk(page, sel);
    report.check(`did: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#did-readout').innerText()).replace(/\s+/g, ' ');
  // Defaults: v* = 25, v_w = 8, C_a = 10^1.7, k^ = k = 0.8.
  const K = 0.8, vs = 25, vw = 8, Ca = 10 ** 1.7;

  let text = await read();
  report.check('did: full decoupling leaves D = C_a at every operating point',
               text.includes(`D = ${sig(Ca)}`) && /operating-point invariant/.test(text), text.slice(0, 260));
  report.check('did: full decoupling removes the wind coupling', /wind is decoupled/.test(text));
  report.check('did: full decoupling holds v* through hill and wind',
               (text.match(/the two agree/g) || []).length === 2 && /hill and headwind 25 m\/s/.test(text),
               text.slice(260, 620));

  // DID only: D = C_a + k(v_o + v_wo), N = k v_o; the hill is cancelled, so the
  // hill speed is the cruise speed, the root of C_a(v* - v) = (k/2) v^2.
  await page.selectOption('#did-case', '1');
  await page.waitForTimeout(80);
  text = await read();
  const D = Ca + K * (vs + vw), N = K * vs;
  report.check('did: DID-only damping is C_a + k(v_o + v_wo)', text.includes(`D = ${sig(D)}`), text.slice(0, 200));
  report.check('did: DID-only wind coupling is k·v_o', text.includes(`${sig(N)} N·s/m`) && text.includes(`D/N = ${sig(D / N)}`),
               text.slice(200, 420));
  const cruise = (-Ca + Math.sqrt(Ca * Ca + 2 * K * Ca * vs)) / K;
  report.check('did: DID-only hill speed equals the calm cruise speed',
               (text.match(new RegExp(`${sig(cruise, 4).replace('.', '\\.')} m/s`, 'g')) || []).length >= 2,
               `expect ${sig(cruise, 4)} twice | ${text.slice(380, 700)}`);
  report.check('did: DID alone is not operating-point invariant', /varies ×/.test(text));
  await shoot(page, 'did-disturbance-only');

  // Economy model: D = C_a + k v_wo, N = k(v_o + v_wo).
  await page.selectOption('#did-case', '2');
  await page.waitForTimeout(80);
  text = await read();
  report.check('did: velocity decoupling gives D = C_a + k·v_wo and N = k(v_o + v_wo)',
               text.includes(`D = ${sig(Ca + K * vw)}`) && text.includes(`${sig(K * (vs + vw))} N·s/m`), text.slice(0, 420));

  // Over-estimating k with a weak C_a makes the linearized loop unstable.
  await setRange(page, '#did-ca', 0);
  await setRange(page, '#did-kh', 1.3);
  await page.waitForTimeout(80);
  text = await read();
  report.check('did: over-decoupling with small C_a is reported unstable', /unstable/.test(text), text.slice(0, 260));
  report.check('did: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkVirtualZeroReference(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/virtual-zero-reference/`, { waitUntil: 'networkidle' });
  for (const sel of ['#vzr-step', '#vzr-frf']) {
    const ink = await canvasInk(page, sel);
    report.check(`vzr: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#vzr-readout').innerText()).replace(/\s+/g, ' ');
  // Defaults: Rp = 1, Lp = 10^-2.3, Ra = 4, no decoupling.
  const Rp = 1, L = 10 ** -2.3, Ra = 4;

  let text = await read();
  report.check('vzr: undecoupled loop settles at Ra/(Ra+Rp)',
               text.includes(`${sig(Ra / (Ra + Rp), 4)} A`) && text.includes(`error ${sig(100 * Rp / (Ra + Rp))}%`),
               text.slice(0, 260));
  report.check('vzr: bandwidth is (Ra+Rp)/(2πLp)', text.includes(`${sig((Ra + Rp) / (2 * Math.PI * L))} Hz`), text.slice(200, 420));
  report.check('vzr: closed form and RK4 agree', /the two agree/.test(text));

  await page.click('#vzr button[data-rh="1"]');
  await page.waitForTimeout(80);
  text = await read();
  report.check('vzr: exact decoupling tracks with zero error',
               /settles at 1 A/.test(text) && /steady-state error 0% of the command/.test(text)
               && /virtual zero reference is gone/.test(text), text.slice(0, 260));
  report.check('vzr: exact decoupling costs Rp of DC stiffness',
               text.includes(`${sig(Ra)} Ω ${sig(Ra + Rp)} Ω without decoupling`) && text.includes(`gave away ${sig(Rp)} Ω`),
               text.slice(300, 560));
  await shoot(page, 'vzr-decoupled');

  await page.click('#vzr button[data-rh="1.2"]');
  await page.waitForTimeout(80);
  text = await read();
  report.check('vzr: over-decoupling settles above the command',
               text.includes(`${sig(Ra / (Ra - 0.2 * Rp), 4)} A`) && /Over-decoupled/.test(text), text.slice(0, 200));

  await setRange(page, '#vzr-ra', 0.1);
  await page.waitForTimeout(80);
  text = await read();
  report.check('vzr: cancelling more resistance than exists is reported unstable',
               /unstable/.test(text) && /does not settle/.test(text), text.slice(0, 200));
  report.check('vzr: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkPICurrentRegulator(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/pi-current-regulator/`, { waitUntil: 'networkidle' });
  for (const sel of ['#pic-splane', '#pic-step']) {
    const ink = await canvasInk(page, sel);
    report.check(`pi: ${sel} has ink`, ink.painted > 300, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#pic-readout').innerText()).replace(/\s+/g, ' ');
  // Defaults: f = 1000 Hz, Rp = 1, Lp = 1e-3, tau_c = tau_e.
  const f = 1000, R = 1, L = 1e-3, wd = 2 * Math.PI * f;

  let text = await read();
  report.check('pi: tuning rule gains are 2πf·Lp and 2πf·Rp',
               text.includes(`${sig(wd * L)} V/A`) && text.includes(`${sig(wd * R)} V/(A·s)`), text.slice(0, 160));
  report.check('pi: cancellation is announced', /pole-zero cancellation/.test(text));
  // A first-order loop at f: -10 log10(1 + r^2) dB and -atan(r) at r = f/f_desired.
  const fo = (r) => [`${sig(-10 * Math.log10(1 + r * r))} dB`, `${sig(-Math.atan(r) * 180 / Math.PI)}°`];
  report.check('pi: cancelled loop is first order at a decade, two decades and the corner',
               [0.01, 0.1, 1].every((r) => fo(r).every((s) => text.includes(s))),
               `${[0.01, 0.1, 1].map(fo).join(' | ')} || ${text.slice(330, 560)}`);
  report.check('pi: measured −3 dB bandwidth is the one asked for',
               text.includes(`bandwidth ${sig(f)} Hz asked for ${sig(f)} Hz`), text.slice(300, 400));
  report.check('pi: closed form and RK4 agree', /the two agree/.test(text), text.slice(-260));

  // Off the rule: poles are the roots of L s^2 + (Kp + R) s + Ki with Ki = 2πf R / rho.
  for (const [rho, expectOvershoot] of [[0.5, true], [1.5, false]]) {
    await page.click(`#pic button[data-rho="${rho}"]`);
    await page.waitForTimeout(80);
    text = await read();
    const b = (wd * L + R) / L, c = (wd * R / rho) / L;
    const root = Math.sqrt(b * b / 4 - c);
    report.check(`pi: closed-loop poles at τc = ${rho}τe match the quadratic`,
                 text.includes(`${sig(-b / 2 + root)} and ${sig(-b / 2 - root)} rad/s`),
                 `expect ${sig(-b / 2 + root)}, ${sig(-b / 2 - root)} | ${text.slice(200, 330)}`);
    report.check(`pi: τc = ${rho}τe ${expectOvershoot ? 'overshoots' : 'does not overshoot'}`,
                 expectOvershoot ? /overshoot [\d.]+%/.test(text) : /overshoot none/.test(text),
                 text.slice(text.indexOf('step'), text.indexOf('step') + 150));
    report.check(`pi: τc = ${rho}τe still agrees with RK4`, /the two agree/.test(text));
    await shoot(page, `pi-rho-${rho}`);
  }
  report.check('pi: no console errors', errors.length === 0, errors.join(' | '));
}

/* ------------------------------------------------------------------ */
/* Week 7: motion control.                                             */
/*                                                                     */
/* Poles are found here by bisection and deflation, and responses by   */
/* complex arithmetic on the transfer functions, so the components'    */
/* Durand-Kerner roots and matrix exponentials are checked rather than */
/* trusted.                                                            */

/** Roots of a s^3 + b s^2 + c s + d with positive coefficients: one real root
 *  by bisection on the negative axis, the other two from the deflated quadratic. */
function cubicRoots(a, b, c, d) {
  const f = (s) => ((a * s + b) * s + c) * s + d;
  let lo = -1, hi = 0;
  while (f(lo) > 0) lo *= 2;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  const r = (lo + hi) / 2;
  const b1 = b + a * r, c1 = c + b1 * r;
  const disc = b1 * b1 - 4 * a * c1;
  const q = disc >= 0
    ? [[(-b1 + Math.sqrt(disc)) / (2 * a), 0], [(-b1 - Math.sqrt(disc)) / (2 * a), 0]]
    : [[-b1 / (2 * a), Math.sqrt(-disc) / (2 * a)], [-b1 / (2 * a), -Math.sqrt(-disc) / (2 * a)]];
  return [[r, 0], ...q];
}
const cx = {
  mul: (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]],
  div: (p, q) => { const m = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / m, (p[1] * q[0] - p[0] * q[1]) / m]; },
  abs: (p) => Math.hypot(p[0], p[1]),
  poly: (cs, s) => cs.reduce((acc, c) => { const m = [acc[0] * s[0] - acc[1] * s[1], acc[0] * s[1] + acc[1] * s[0]]; return [m[0] + c, m[1]]; }, [0, 0]),
};

async function checkMotionStiffnessTuning(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/motion-stiffness-tuning/`, { waitUntil: 'networkidle' });
  for (const sel of ['#mst-frf', '#mst-step']) {
    const ink = await canvasInk(page, sel);
    report.check(`mst: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#mst-readout').innerText()).replace(/\s+/g, ' ');
  const gainsOf = (fv, fp, fip, J = 1e-5, bp = 1e-5) => {
    const ba = J * 2 * Math.PI * fv - bp, B = bp + ba, Ks = B * 2 * Math.PI * fp, Ki = Ks * 2 * Math.PI * fip;
    return { J, ba, B, Ks, Ki };
  };
  const poleText = (g) => cubicRoots(g.J, g.B, g.Ks, g.Ki)
    .sort((p, q) => Math.hypot(...q) - Math.hypot(...p)).filter((p) => p[1] >= 0)
    .map((p) => (p[1] > 0 ? `${sig(p[0] / (2 * Math.PI))} ± j${sig(p[1] / (2 * Math.PI))}` : sig(p[0] / (2 * Math.PI))))
    .join(', ');

  // Defaults: 100 / 5 / 0.1 Hz, J = b_p = 1e-5.
  let g = gainsOf(100, 10 ** 0.699, 0.1);
  let text = await read();
  report.check('mst: gains follow the asymptote rule',
               text.includes(`= ${sig(g.ba)} N·m·s/rad`) && text.includes(`= ${sig(g.Ks)} N·m/rad`)
               && text.includes(`= ${sig(g.Ki)} N·m/(rad·s)`), text.slice(0, 200));
  report.check('mst: closed-loop poles are the roots of J s³ + (bp+ba) s² + Ksa s + Kisa',
               text.includes(`${poleText(g)} Hz`), `expect ${poleText(g)} | ${text.slice(200, 300)}`);
  // The floor of |T_L/theta| found by a dense scan here.
  let floor = Infinity;
  for (let k = 0; k <= 4000; k++) {
    const w = 2 * Math.PI * 10 ** (-2 + (5 * k) / 4000);
    floor = Math.min(floor, Math.hypot(g.Ks - g.J * w * w, g.B * w - g.Ki / w));
  }
  report.check('mst: the stiffness floor is Ksa when the loops are a decade apart',
               text.includes(`min |TL/θ| = ${sig(floor)} N·m/rad`) && sig(floor) === sig(g.Ks), `scan ${sig(floor)}, Ksa ${sig(g.Ks)}`);
  report.check('mst: exact and RK4 agree', /the two agree/.test(text), text.slice(-260));
  await shoot(page, 'mst-default');

  // Doubling f_ip doubles K_isa and leaves b_a and K_sa alone.
  await page.click('#mst button[data-f="100,5,0.2"]');
  await page.waitForTimeout(80);
  const g2 = gainsOf(100, 5, 0.2);
  text = await read();
  report.check('mst: doubling f_ip doubles Kisa only',
               text.includes(`= ${sig(g2.Ki)} N·m/(rad·s)`) && text.includes(`= ${sig(g2.Ks)} N·m/rad`)
               && near(g2.Ki / gainsOf(100, 5, 0.1).Ki, 2, 1e-12), text.slice(0, 200));

  // Crowded loops: two poles go complex, and the tool says so.
  await page.click('#mst button[data-f="20,6,2"]');
  await page.waitForTimeout(80);
  g = gainsOf(20, 6, 2);
  text = await read();
  const crowdedPoles = poleText(g);
  report.check('mst: crowded loops give a complex pair, reported as such',
               crowdedPoles.includes('± j') && text.includes(`${crowdedPoles} Hz`) && /complex pair/.test(text),
               `expect ${crowdedPoles} | ${text.slice(200, 320)}`);
  report.check('mst: crowded case still agrees with RK4', /the two agree/.test(text));
  await shoot(page, 'mst-crowded');

  // More bearing drag than the velocity loop asks for: b_a would be negative.
  await setRange(page, '#mst-fv', 1);
  await setRange(page, '#mst-bp', -2);
  await page.waitForTimeout(80);
  text = await read();
  report.check('mst: a negative b_a is reported, not hidden', /comes out negative/.test(text), text.slice(-220));

  // Regression: f_v = f_ip puts two poles on the imaginary axis (Routh), and
  // "simulate until the slowest pole decays" used to run forever there.
  await setRange(page, '#mst-bp', -5);
  let t0 = Date.now();
  await setRange(page, '#mst-fip', 1);
  await page.waitForTimeout(50);
  text = await read();
  report.check('mst: f_v = f_ip is reported as marginal and does not hang',
               /imaginary axis/.test(text) && Date.now() - t0 < 5000, `${Date.now() - t0} ms | ${text.slice(-200)}`);
  // Just inside it: whether the window had to be capped is decided here from
  // the roots, and the readout must either agree with RK4 or say it is unsettled.
  await setRange(page, '#mst-fip', 0.999);
  await page.waitForTimeout(50);
  text = await read();
  {
    const wv = 2 * Math.PI * 10, wp = 2 * Math.PI * 6, wi = 2 * Math.PI * 10 ** 0.999;
    const r = cubicRoots(1, wv, wv * wp, wv * wp * wi);
    const slow = Math.min(...r.map((z) => Math.abs(z[0]))), fast = Math.max(...r.map((z) => Math.hypot(...z)));
    // The tool's stated policy: 8/slow, at most 2e4/fast, at most 50 cycles of
    // any pair with zeta < 0.02.
    const ring = r.filter((z) => Math.abs(z[1]) > 0 && -z[0] < 0.02 * Math.hypot(...z));
    const cap = Math.min(2e4 / fast, ...ring.map((z) => 50 * 2 * Math.PI / Math.abs(z[1])));
    const capped = 8 / slow > cap;
    report.check(`mst: just inside the boundary RK4 agrees${capped ? ' and the capped window says it is unsettled' : ''}`,
                 /the two agree/.test(text) && (!capped || /not settled/.test(text)),
                 `slow ${slow.toExponential(2)} rad/s | ${text.slice(text.indexOf('load step'), text.indexOf('load step') + 200)}`);
  }
  report.check('mst: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkMotionCommandPaths(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/motion-command-paths/`, { waitUntil: 'networkidle' });
  for (const sel of ['#mcp-frf', '#mcp-time']) {
    const ink = await canvasInk(page, sel);
    report.check(`mcp: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#mcp-readout').innerText()).replace(/\s+/g, ' ');
  const J = 1e-5, bp = 1e-5, fc = 10, fv = 100, fp = 10 ** 0.699, fip = 0.1;
  const ba = J * 2 * Math.PI * fv - bp, B = bp + ba, Ks = B * 2 * Math.PI * fp, Ki = Ks * 2 * Math.PI * fip;
  const Kpp = (Ks + Math.sqrt(Ks * Ks - 4 * ba * Ki)) / (2 * ba), Kiv = Ki / Kpp;
  const den = [J, B, Ks, Ki];
  const nums = { 'sfb-w': [ba, Ks, Ki], 'sfb': [0, Ks, Ki], 'cls': [0, Kpp * ba, Kpp * Kiv], 'cls-ff': [ba, Ks, Ki] };
  const s = [0, 2 * Math.PI * fc];
  const row = (k) => {
    const H = cx.div(cx.poly(nums[k], s), cx.poly(den, s));
    return `|θ/θ*| = ${sig(cx.abs(H))}, ${sig(Math.atan2(H[1], H[0]) * 180 / Math.PI)}°`;
  };

  let text = await read();
  report.check('mcp: classical gains map onto the state feedback poles',
               text.includes(`Kpp = ${sig(Kpp)} 1/s`) && text.includes(`Kiv = ${sig(Kiv)} N·m/(rad·s)`)
               && near(Kpp * ba + Kiv, Ks, 1e-9 * Ks) && near(Kpp * Kiv, Ki, 1e-9 * Ki), text.slice(0, 220));
  report.check('mcp: every path\'s response at fc matches its transfer function',
               Object.keys(nums).every((k) => text.includes(row(k))),
               `${Object.keys(nums).map(row).join(' | ')} || ${text.slice(280, 620)}`);
  report.check('mcp: velocity feedforward makes the cascade the state controller with ω*',
               row('sfb-w') === row('cls-ff') && row('sfb-w') !== row('sfb'));

  for (const path of ['sfb-w', 'sfb', 'cls', 'cls-ff']) {
    await page.selectOption('#mcp-path', path);
    await page.waitForTimeout(120);
    text = await read();
    const H = cx.div(cx.poly(nums[path], s), cx.poly(den, s));
    const err = Math.hypot(1 - H[0], H[1]);
    report.check(`mcp: ${path} run settles to the closed-form error amplitude ${sig(err)} rad`,
                 text.includes(`: ${sig(err)} rad closed form ${sig(err)} rad`) && /the two agree/.test(text),
                 text.slice(text.indexOf('this run'), text.indexOf('this run') + 140));
    const clsShown = await page.locator('#mcp-fig-cls').isVisible();
    const sfbShown = await page.locator('#mcp-fig-sfb').isVisible();
    report.check(`mcp: ${path} shows the ${path.startsWith('cls') ? 'cascade' : 'state feedback'} diagram`,
                 path.startsWith('cls') ? clsShown && !sfbShown : sfbShown && !clsShown);
  }
  await shoot(page, 'mcp-cls-ff');

  // Position and integral loops on top of each other: no real cascade gives these poles.
  await setRange(page, '#mcp-fp', -0.301);
  await setRange(page, '#mcp-fip', -0.301);
  await page.selectOption('#mcp-path', 'cls');
  await page.waitForTimeout(120);
  text = await read();
  report.check('mcp: a cascade that cannot exist is reported, not drawn',
               /no real Kpp, Kiv/.test(text) && /K_?pp would be complex|Kpp would be complex/.test(text), text.slice(0, 260));
  // Regression: f_v = f_ip is the Routh boundary; the start-up never dies away.
  await page.selectOption('#mcp-path', 'sfb-w');
  await setRange(page, '#mcp-fv', 1);
  const t0 = Date.now();
  await setRange(page, '#mcp-fip', 1);
  await page.waitForTimeout(50);
  text = await read();
  report.check('mcp: at f_v = f_ip the run reports an unsettled start-up and does not hang',
               /not died away/.test(text) && Date.now() - t0 < 5000, `${Date.now() - t0} ms | ${text.slice(text.indexOf('this run'), text.indexOf('this run') + 160)}`);
  report.check('mcp: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkResonantLoad(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/resonant-load/`, { waitUntil: 'networkidle' });
  for (const sel of ['#rsl-frf', '#rsl-step']) {
    const ink = await canvasInk(page, sel);
    report.check(`rsl: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#rsl-readout').innerText()).replace(/\s+/g, ' ');
  const Jm = 1e-4, JL = 10 ** -3.5, Kr = 1e4;
  const Jpar = Jm * JL / (Jm + JL);
  const f1 = Math.sqrt(Kr / Jm) / (2 * Math.PI), f2 = Math.sqrt(Kr / Jpar) / (2 * Math.PI);

  let text = await read();
  report.check('rsl: peak at √(Kr/Jm) and notch at √(Kr/J∥)',
               text.includes(`= ${sig(f1)} Hz`) && text.includes(`= ${sig(f2)} Hz`), text.slice(0, 160));
  report.check('rsl: the bare mechanism is free: two poles at the origin, zero static stiffness',
               /2 poles at s = 0/.test(text) && /at 0 Hz = 0 /.test(text), text.slice(150, 330));
  report.check('rsl: exact and RK4 agree', /the two agree/.test(text));
  const sliderOff = await page.locator('#rsl label[data-sym="Khat"]').evaluate((el) => el.classList.contains('is-off'));
  report.check('rsl: the K̂r slider stays usable while its parts are greyed', !sliderOff);

  // K_hat_r = K_r: the motor stops moving and the load rings at sqrt(Kr/JL).
  await page.click('#rsl button[data-kh="1"]');
  await page.waitForTimeout(100);
  text = await read();
  const modes = [...text.matchAll(/([\d.e+-]+) Hz, ζ =/g)].map((m) => parseFloat(m[1]));
  const want = [Math.sqrt(Kr / JL), Math.sqrt(Kr / Jm)].map((w) => w / (2 * Math.PI)).sort((a, b) => a - b);
  report.check('rsl: ideal decoupling factors into √(Kr/JL) and √(Kr/Jm)',
               modes.length === 2 && modes.every((m, i) => Math.abs(m - want[i]) / want[i] < 2e-3),
               `modes ${modes.join(', ')} vs ${want.map((w) => sig(w)).join(', ')}`);
  const range = (name) => {
    const m = text.match(new RegExp(`${name} from ([-\\d.e+]+) to ([-\\d.e+]+) rad`));
    return m ? Math.abs(parseFloat(m[2]) - parseFloat(m[1])) : NaN;
  };
  report.check('rsl: with K̂r = Kr the motor barely moves and the load swings',
               range('θm') < 0.02 * range('θL'), `θm ${range('θm')}, θL ${range('θL')}`);
  await shoot(page, 'rsl-decoupled');

  await page.click('#rsl button[data-kh="0.3"]');
  await page.waitForTimeout(100);
  text = await read();
  report.check('rsl: partial decoupling acts as a spring of K̂r', text.includes(`−TL/K̂r = ${sig(-1 / (0.3 * Kr))} rad`),
               text.slice(150, 360));

  // Equal inertias put two poles on top of each other at K̂r = Kr.
  await setRange(page, '#rsl-jl', -4);
  await page.click('#rsl button[data-kh="1"]');
  await page.waitForTimeout(100);
  text = await read();
  report.check('rsl: coincident poles still agree with RK4 and print numbers',
               /the two agree/.test(text) && !/NaN|Infinity/.test(text), text.slice(-300));
  report.check('rsl: no console errors', errors.length === 0, errors.join(' | '));
}

async function checkStiffnessBandwidth(page, origin, report) {
  const errors = watchErrors(page);
  await page.goto(`${origin}/interactives/stiffness-bandwidth/`, { waitUntil: 'networkidle' });
  for (const sel of ['#sbw-ds', '#sbw-bode', '#sbw-step', '#sbw-sine']) {
    const ink = await canvasInk(page, sel);
    report.check(`sbw: ${sel} has ink`, ink.painted > 400, `${ink.painted} painted`);
  }
  const read = async () => (await page.locator('#sbw-readout').innerText()).replace(/\s+/g, ' ');
  const num = (text, re) => { const m = text.match(re); return m ? m[1] : null; };
  const W = 2 * Math.PI;
  const J = 1e-5, bp = 1e-5;
  const ba = J * W * 100 - bp, B = bp + ba, Ks = B * W * 5, Ki = Ks * W * 0.1;

  // Independent: crossings, poles, Bode readings, all from the gains.
  const fv = B / (W * J), fp = Ks / (W * B), fip = Ki / (W * Ks);
  const H = (n, f) => cx.div(cx.poly(n, [0, W * f]), cx.poly([J, B, Ks, Ki], [0, W * f]));
  const posLoop = (f) => { const w = W * f; return Math.hypot(Ks, Ki / w) / (w * Math.hypot(B, J * w)); };
  const firstBelow = (g, level) => {
    let prev = -6;
    for (let k = 1; k <= 24000; k++) {
      const lf = -6 + (12 * k) / 24000;
      if (g(10 ** lf) < level) {
        let lo = prev, hi = lf;
        for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (g(10 ** m) > level) lo = m; else hi = m; }
        return 10 ** ((lo + hi) / 2);
      }
      prev = lf;
    }
    return NaN;
  };
  const fPos = firstBelow(posLoop, 1);
  const bwW = firstBelow((f) => cx.abs(H([ba, Ks, Ki], f)), Math.SQRT1_2);
  const bw0 = firstBelow((f) => cx.abs(H([0, Ks, Ki], f)), Math.SQRT1_2);
  const poleText = cubicRoots(J, B, Ks, Ki)
    .sort((p, q) => Math.hypot(...q) - Math.hypot(...p)).filter((p) => p[1] >= 0)
    .map((p) => (p[1] > 0 ? `${sig(p[0] / W)} ± j${sig(p[1] / W)}` : sig(p[0] / W))).join(', ');

  let text = await read();
  report.check('sbw: crossings computed from the gains land at 100 / 5 / 0.1 Hz',
               num(text, /2πJp = ([\d.e+-]+) Hz/) === sig(fv) && num(text, /\(bp \+ ba\) = ([\d.e+-]+) Hz/) === sig(fp)
               && num(text, /2πKsa = ([\d.e+-]+) Hz/) === sig(fip) && sig(fv) === '100' && sig(fip) === '0.1', text.slice(0, 200));
  report.check('sbw: closed-loop poles are the roots of J s³ + (bp+ba) s² + Ksa s + Kisa',
               text.includes(`${poleText} Hz`), `expect ${poleText} | ${text.slice(180, 290)}`);
  report.check('sbw: the velocity loop alone is −3 dB exactly at f_v',
               num(text, /alone: −3 dB at ([\d.e+-]+) Hz/) === sig(fv), text.slice(280, 420));
  report.check('sbw: the position loop gain crosses 1 where an independent bisection says',
               num(text, /\|L\| = 1 at ([\d.e+-]+) Hz/) === sig(fPos), `expect ${sig(fPos)} | ${text.slice(300, 440)}`);
  report.check('sbw: closed-loop −3 dB with and without ω* match the transfer functions',
               num(text, /with ω\*: ([\d.e+-]+) Hz/) === sig(bwW) && num(text, /without ω\*: ([\d.e+-]+) Hz/) === sig(bw0),
               `expect ${sig(bwW)}, ${sig(bw0)} | ${text.slice(400, 520)}`);
  const atFc = (n) => { const h = H(n, 10); return `|θ/θ*| = ${sig(cx.abs(h))}, ${sig(Math.atan2(h[1], h[0]) * 180 / Math.PI)}°`; };
  report.check('sbw: at fc the Bode value is |N/D| with ω*, and the exact time trace agrees',
               text.includes(atFc([ba, Ks, Ki])) && /the two agree/.test(text),
               `expect ${atFc([ba, Ks, Ki])} | ${text.slice(text.indexOf('at fc'), text.indexOf('at fc') + 160)}`);
  const peak = parseFloat(num(text, /peak θ = ([-\d.e+]+) rad/));
  const fin = parseFloat(([...text.matchAll(/θ = ([-\d.e+]+) rad at/g)].pop() ?? [])[1]);   // the last one: the end of the window
  report.check('sbw: the integral loop brings the load step back to zero',
               isFinite(peak) && isFinite(fin) && Math.abs(fin) < 1e-3 * Math.abs(peak), `peak ${peak}, final ${fin}`);
  await shoot(page, 'sbw-default');

  // Without omega*: the figure greys the omega* input and the Bode marker moves to the other curve.
  await page.uncheck('#sbw-wstar');
  await page.waitForTimeout(80);
  text = await read();
  const greyed = await page.locator('#sbw .sysfig .is-off').count();
  const labelOff = await page.locator('#sbw label[data-sym="wstar"]').evaluate((el) => el.classList.contains('is-off'));
  report.check('sbw: unticking ω* greys its input in the figure, not the checkbox',
               greyed > 0 && !labelOff, `${greyed} greyed, label off ${labelOff}`);
  report.check('sbw: without ω* the fc reading is |(Ksa s + Kisa)/D| and still agrees with the trace',
               text.includes(atFc([0, Ks, Ki])) && /the two agree/.test(text),
               `expect ${atFc([0, Ks, Ki])} | ${text.slice(text.indexOf('at fc'), text.indexOf('at fc') + 160)}`);
  await page.check('#sbw-wstar');

  // Each gain moves its own crossings: K_isa only f_ip; K_sa both f_p and f_ip; b_a both f_v and f_p.
  const crossings = (t) => [/2πJp = ([\d.e+-]+) Hz/, /\(bp \+ ba\) = ([\d.e+-]+) Hz/, /2πKsa = ([\d.e+-]+) Hz/].map((re) => num(t, re));
  await setRange(page, '#sbw-ki', Math.log10(2 * Ki));
  await page.waitForTimeout(80);
  let c = crossings(await read());
  report.check('sbw: doubling K_isa doubles f_ip and leaves f_v and f_p', c[0] === '100' && c[1] === '5' && c[2] === '0.2', c.join(', '));
  await setRange(page, '#sbw-ki', Math.log10(Ki));
  await setRange(page, '#sbw-ks', Math.log10(2 * Ks));
  await page.waitForTimeout(80);
  c = crossings(await read());
  report.check('sbw: doubling K_sa doubles f_p and halves f_ip, f_v unchanged', c[0] === '100' && c[1] === '10' && c[2] === '0.05', c.join(', '));
  await setRange(page, '#sbw-ks', Math.log10(Ks));

  // Compliance view is the same curve upside down.
  await page.check('#sbw-flip');
  await page.waitForTimeout(80);
  const cap = await page.locator('#sbw-ds-cap').innerText();
  const inkFlip = await canvasInk(page, '#sbw-ds');
  report.check('sbw: the flip draws compliance and says it is a Bode plot', /Bode magnitude/.test(cap) && inkFlip.painted > 400, cap);
  await page.uncheck('#sbw-flip');

  // f_ip above f_v: Routh fails, exactly as the crossings predict, and nothing hangs or prints NaN.
  const t0 = Date.now();
  await page.click('#sbw button[data-f="100,5,150"]');
  await page.waitForTimeout(80);
  text = await read();
  report.check('sbw: f_ip above f_v is reported unstable via Routh written with the crossings',
               /Unstable/.test(text) && /exactly fip < fv/.test(text) && !/NaN|Infinity/.test(text) && Date.now() - t0 < 5000,
               `${Date.now() - t0} ms | ${text.slice(-300)}`);
  report.check('sbw: no console errors', errors.length === 0, errors.join(' | '));
}

/**
 * The /interactives/ index is written week by week by hand, so a tool can be
 * built, registered and verified and still never be linked from it (week 7's
 * four tools were, until this check). Every built tool page must be linked.
 */
async function checkIndexListsEveryTool(page, origin, report) {
  const built = fs.readdirSync(path.join(DIST, 'interactives'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(DIST, 'interactives', d.name, 'index.html')))
    .map((d) => d.name);
  await page.goto(`${origin}/interactives/`, { waitUntil: 'networkidle' });
  const linked = await page.locator('main a[href*="/interactives/"]').evaluateAll((as) =>
    as.map((a) => new URL(a.href).pathname.split('/').filter(Boolean).pop()));
  const missing = built.filter((name) => !linked.includes(name));
  report.check('index: every built tool page is linked from /interactives/', missing.length === 0,
               `${built.length} pages, missing: ${missing.join(', ') || 'none'}`);
}

/**
 * The figures above each tool: the device, and the same system as a block
 * diagram.
 *
 * Their whole job is correspondence -- a slider named R_p must light up a
 * resistor and a block. So the checks are about the tags, not the pixels:
 *
 *   - every visible tagged control has its symbol drawn in a visible figure,
 *     which catches a slider that was added without a part, and a part whose
 *     tag was renamed out from under a slider,
 *   - every value slot has actually been filled by the page, since a slot
 *     that stays empty is a figure quietly lying about being live,
 *   - hovering a control lights something in the figures.
 */
const FIGURE_ROUTES = [
  'second-order-response', 'physical-active-feedback', 'dynamic-stiffness',
  'voltage-source-stiffness', 'eigenvalue-migration', 'motor-transfer-matrix',
  'motor-state-feedback', 'input-decoupling', 'disturbance-decoupling',
  'virtual-zero-reference', 'pi-current-regulator',
  'motion-stiffness-tuning', 'motion-command-paths', 'resonant-load', 'stiffness-bandwidth',
];

async function checkSystemFigures(page, origin, report) {
  for (const route of FIGURE_ROUTES) {
    const errors = watchErrors(page);
    await page.goto(`${origin}/interactives/${route}/`, { waitUntil: 'networkidle' });

    const survey = await page.evaluate(() => {
      const visible = (el) => !!(el.getBoundingClientRect().width || el.getBoundingClientRect().height);
      const keys = (el) => (el.getAttribute('data-sym') || '').trim().split(/\s+/).filter(Boolean);
      const figs = [...document.querySelectorAll('.sysfig')].filter(visible);
      const drawn = new Set();
      const slots = [];
      for (const fig of figs) {
        for (const el of fig.querySelectorAll('[data-sym]')) for (const k of keys(el)) drawn.add(k);
        for (const el of fig.querySelectorAll('[data-val]')) {
          slots.push([el.getAttribute('data-val'), (el.textContent || '').trim()]);
        }
      }
      const controls = [...document.querySelectorAll('label[data-sym]')]
        .filter(visible).map((el) => keys(el)[0]);
      const sizes = [...document.querySelectorAll('.sysfig:not([hidden]) .sysfig-svg')]
        .map((el) => Math.round(el.getBoundingClientRect().width));
      return { drawn: [...drawn], slots, controls, figures: figs.length, sizes };
    });

    report.check(`figures[${route}]: both panels rendered with width`,
                 survey.figures > 0 && survey.sizes.length > 0 && survey.sizes.every((w) => w > 120),
                 `${survey.figures} figure block(s), widths ${survey.sizes.join(', ')}`);

    const orphans = survey.controls.filter((k) => !survey.drawn.includes(k));
    report.check(`figures[${route}]: every slider symbol is drawn`, orphans.length === 0,
                 `controls ${survey.controls.join(', ')} | undrawn ${orphans.join(', ') || 'none'}`);

    const empty = survey.slots.filter(([, v]) => !v).map(([k]) => k);
    report.check(`figures[${route}]: value slots filled by the page`,
                 survey.slots.length > 0 && empty.length === 0,
                 `${survey.slots.length} slot(s), empty: ${empty.join(', ') || 'none'}`);

    const first = survey.controls[0];
    await page.locator(`label[data-sym="${first}"]`).first().hover();
    const lit = await page.evaluate(() => document.querySelectorAll('.is-hot').length);
    report.check(`figures[${route}]: hovering ${first} lights the figures`, lit >= 2,
                 `${lit} element(s) marked`);
    await page.mouse.move(0, 0);

    report.check(`figures[${route}]: no console errors`, errors.length === 0, errors.join(' | '));
  }

  // The two modes of the migration tool are different systems, so they must
  // not show the same figure: slide 14 is spent on exactly that distinction.
  await page.goto(`${origin}/interactives/eigenvalue-migration/`, { waitUntil: 'networkidle' });
  const supplyShown = await page.locator('#evm-fig-supply').isVisible();
  await page.selectOption('#evm-mode', 'locus');
  const swapped = await page.locator('#evm-fig-locus').isVisible()
    && await page.locator('#evm-fig-supply').isHidden();
  report.check('figures[migration]: the mode select swaps the figure', supplyShown && swapped,
               `supply first: ${supplyShown}, swapped: ${swapped}`);

  // The state-feedback tool draws one motor for all four cases and greys the
  // parts a case does not use, so switching must change what is greyed.
  await page.goto(`${origin}/interactives/motor-state-feedback/`, { waitUntil: 'networkidle' });
  await page.selectOption('#msf-case', '0');
  const offPlain = await page.locator('#msf .is-off').count();
  await page.selectOption('#msf-case', '3');
  const offFull = await page.locator('#msf .is-off').count();
  report.check('figures[feedback-mod]: unused parts grey out per case',
               offPlain > 0 && offFull === 0, `case 0 greys ${offPlain}, case 3 greys ${offFull}`);
}

/* ------------------------------------------------------------------ */

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error(`No build at ${DIST}. Run: npm run build`);
    process.exit(2);
  }
  fs.rmSync(OUT, { recursive: true, force: true });

  const server = await serve(DIST);
  const browser = await chromium.launch({ headless: !headed });
  const report = new Report();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    for (const scenario of [checkEigenGeometry, checkSecondOrder, checkModal,
                            checkDiagramDecomposition, checkPhysicalActive, checkLinearization,
                            checkDynamicStiffness, checkVoltageSourceStiffness,
                            checkEigenvalueMigration, checkMotorTransferMatrix,
                            checkMotorStateFeedback, checkDecouplingDerivation, checkInputDecoupling,
                            checkDisturbanceDecoupling, checkVirtualZeroReference,
                            checkPICurrentRegulator, checkMotionStiffnessTuning,
                            checkMotionCommandPaths, checkResonantLoad, checkStiffnessBandwidth, checkSystemFigures, checkIndexListsEveryTool]) {
      const page = await ctx.newPage();
      await scenario(page, server.origin, report);
      await page.close();
    }
    await ctx.close();

    // Concept notes only exist in the private build; skip quietly if absent.
    const noteIds = fs.existsSync(path.join(DIST, 'concepts'))
      ? fs.readdirSync(path.join(DIST, 'concepts'), { withFileTypes: true })
          .filter((d) => d.isDirectory()).map((d) => d.name)
      : [];
    await checkNotes(browser, server.origin, report, noteIds);

    await checkResponsiveAndThemes(browser, server.origin, report);
  } finally {
    await browser.close();
    await server.close();
  }

  console.log('\nBrowser verification');
  report.print();
  const failed = report.failures.length;
  console.log(`\n${report.results.length - failed}/${report.results.length} checks passed`);
  console.log(`screenshots: ${path.relative(process.cwd(), OUT)}/`);
  if (failed) {
    console.error(`\n${failed} FAILURE(S)`);
    process.exit(1);
  }
}

await main();
