/**
 * Verify the practice block diagrams without a browser.
 *
 *   node verify/verify-diagram-problems.mjs
 *
 * The decomposition interactive derives every region equation from the
 * diagram's signal graph, so the risk is not "the answer key disagrees with
 * the drawing" -- it is that the graph itself is wrong, or that the drawing
 * does not show the graph it claims to. This checks both, independently:
 *
 *   STRUCTURE   every wire resolves; junctions have signed inputs; blocks
 *               have one input; a nonlinear block's wired inputs are exactly
 *               the signals its function uses; only 1/s may contain s; every
 *               element belongs to exactly one region.
 *   GEOMETRY    every wire ends ON its destination and starts ON its source
 *               (or on another wire from the same source, for a tap); every
 *               region box contains its members.
 *   ALGEBRA     each region's displayed equation equals the graph derivation;
 *               the UI checker accepts it and names a flipped sign as a sign
 *               error.
 *   TARGETS     transfer functions checked by an independent linear solve of
 *               the whole graph at random numeric s; slopes by central finite
 *               difference; equilibria by evaluating the state derivative.
 */

import { lusolve, parse } from 'mathjs';
import { problems, feedbackDiagram } from '../src/lib/diagram-problems.mjs';
import {
  derive, edgesInto, elementById, wireSignal, isIntegrator, symbolsIn, allSignals,
  checkRegionAnswer, checkTarget, targetTruth, equivalent, integratorInput,
  stateExpansionSet, regionInputs, regionParams, rng, toTex,
} from '../src/lib/diagram-algebra.mjs';
import { Report } from './lib.mjs';

const report = new Report();
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

function bbox(el) {
  if (el.kind === 'sum') { const r = el.r ?? 13; return [el.x - r, el.y - r, el.x + r, el.y + r]; }
  const w = el.w ?? 46, h = el.h ?? 40;
  return [el.x - w / 2, el.y - h / 2, el.x + w / 2, el.y + h / 2];
}

function onBoundary(el, [px, py], tol = 1.5) {
  if (el.kind === 'sum') {
    return Math.abs(Math.hypot(px - el.x, py - el.y) - (el.r ?? 13)) <= tol;
  }
  const [x0, y0, x1, y1] = bbox(el);
  const inX = px >= x0 - tol && px <= x1 + tol;
  const inY = py >= y0 - tol && py <= y1 + tol;
  return (inX && (Math.abs(py - y0) <= tol || Math.abs(py - y1) <= tol))
      || (inY && (Math.abs(px - x0) <= tol || Math.abs(px - x1) <= tol));
}

function onPolyline(pts, [px, py], tol = 1.5) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (len === 0) continue;
    const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (len * len)));
    if (Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay))) <= tol) return true;
  }
  return false;
}

/* ------------------------------------------------------------------------ */

function checkStructure(p) {
  const ids = p.elements.map((e) => e.id);
  const outs = allSignals(p);
  report.check(`${p.id}: element ids unique`, new Set(ids).size === ids.length);
  report.check(`${p.id}: signal names unique`, new Set(outs).size === outs.length, outs.join(','));

  let resolved = true;
  for (const w of p.wires) {
    try { wireSignal(p, w); } catch { resolved = false; }
    if (w.dst && !elementById(p, w.dst)) resolved = false;
  }
  report.check(`${p.id}: every wire resolves`, resolved);

  for (const el of p.elements) {
    const into = edgesInto(p, el.id);
    if (el.kind === 'sum') {
      report.check(`${p.id}/${el.id}: junction has >=2 signed inputs`,
                   into.length >= 2 && into.every((w) => w.sign === '+' || w.sign === '-'));
    } else if (el.kind === 'gain') {
      report.check(`${p.id}/${el.id}: block has exactly one input`, into.length === 1, `${into.length}`);
      const usesS = symbolsIn(el.gain).includes('s');
      report.check(`${p.id}/${el.id}: only a pure 1/s integrator contains s`, !usesS || isIntegrator(el), el.gain);
    } else if (el.kind === 'fn') {
      const wired = new Set(into.map((w) => wireSignal(p, w)));
      const signals = new Set(allSignals(p));
      const used = new Set(symbolsIn(el.fn).filter((s) => signals.has(s)));
      const same = wired.size === used.size && [...wired].every((s) => used.has(s));
      report.check(`${p.id}/${el.id}: nonlinear block inputs match its function`, same,
                   `wired {${[...wired]}} vs used {${[...used]}}`);
    }
    if (el.kind !== 'sum') {
      report.check(`${p.id}/${el.id}: no sign on a non-junction input`, into.every((w) => !w.sign));
    }
  }

  const counts = new Map(ids.map((id) => [id, 0]));
  for (const r of p.regions) for (const m of r.members) counts.set(m, (counts.get(m) ?? 0) + 1);
  const bad = [...counts].filter(([, c]) => c !== 1);
  report.check(`${p.id}: every element in exactly one region`, bad.length === 0,
               bad.map(([id, c]) => `${id}×${c}`).join(' '));
}

function checkGeometry(p) {
  const problems = [];
  for (const w of p.wires) {
    const end = w.pts[w.pts.length - 1];
    const start = w.pts[0];
    if (w.dst && !onBoundary(elementById(p, w.dst), end)) problems.push(`${w.src}->${w.dst} end ${end}`);
    const srcEl = elementById(p, w.src);
    if (srcEl) {
      const startsOnSource = onBoundary(srcEl, start);
      const startsOnSibling = p.wires.some((o) => o !== w && o.src === w.src && !o.tap && onPolyline(o.pts, start));
      if (w.tap ? !startsOnSibling : !startsOnSource) problems.push(`${w.src}->${w.dst ?? 'out'} start ${start}${w.tap ? ' (tap)' : ''}`);
    }
    // Segments must be axis-aligned or deliberately diagonal; a near-miss
    // (off by a few units) is a typo that draws as a kinked line.
    for (let i = 1; i < w.pts.length; i++) {
      const dx = Math.abs(w.pts[i][0] - w.pts[i - 1][0]);
      const dy = Math.abs(w.pts[i][1] - w.pts[i - 1][1]);
      if ((dx > 0 && dx < 4 && dy > 4) || (dy > 0 && dy < 4 && dx > 4)) problems.push(`${w.src} kinked segment ${i}`);
    }
  }
  report.check(`${p.id}: wires start and end on what they connect`, problems.length === 0, problems.join('; '));

  const loose = [];
  for (const r of p.regions) {
    const [bx, by, bw, bh] = r.box;
    for (const id of r.members) {
      const [x0, y0, x1, y1] = bbox(elementById(p, id));
      if (x0 < bx || y0 < by || x1 > bx + bw || y1 > by + bh) loose.push(`region ${r.n} misses ${id}`);
    }
  }
  report.check(`${p.id}: region boxes contain their members`, loose.length === 0, loose.join('; '));
}

function checkRegions(p) {
  for (const r of p.regions) {
    const truth = derive(p, r.out, new Set(r.members));
    report.check(`${p.id} region ${r.n}: displayed equation equals graph derivation`,
                 equivalent(r.show, truth), `${r.show}  vs  ${truth}`);

    const verdict = checkRegionAnswer(p, r, r.show);
    report.check(`${p.id} region ${r.n}: UI checker accepts the displayed equation`,
                 verdict.status === 'correct', verdict.message);

    // A sign error must be caught AND named as a sign error.
    const junction = r.members.map((id) => elementById(p, id)).find((e) => e.kind === 'sum');
    if (junction) {
      const w = edgesInto(p, junction.id)[0];
      const flipped = derive(p, r.out, new Set(r.members), { flip: w });
      const v = checkRegionAnswer(p, r, flipped.replace(/\s+/g, ' '));
      report.check(`${p.id} region ${r.n}: a flipped junction sign is diagnosed as a sign error`,
                   v.status === 'wrong' && /sign/i.test(v.message), v.message);
    }

    // TeX rendering must not fall back to mathjs's escaped output.
    const tex = toTex(r.show, p.symbols);
    report.check(`${p.id} region ${r.n}: TeX has no escaped underscores`, !/\\_/.test(tex), tex);

    // Every symbol needed to type the answer is offered.
    const offered = new Set([...regionInputs(p, r.members), ...regionParams(p, r.members).params, 's']);
    const needed = symbolsIn(r.show);
    report.check(`${p.id} region ${r.n}: answer is typeable from offered symbols`,
                 needed.every((s) => offered.has(s)), `needs ${needed}`);
  }
}

/** Solve the (linearized) graph for all signals with numeric s and params. */
function linearSolve(p, s, params, inputValues) {
  const unknowns = p.elements.map((e) => e.out);
  const index = new Map(unknowns.map((u, i) => [u, i]));
  const n = unknowns.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  const scope = { ...params, s };

  const addTerm = (row, signal, coeff) => {
    if (index.has(signal)) A[row][index.get(signal)] -= coeff;
    else b[row] += coeff * (inputValues[signal] ?? 0);
  };

  p.elements.forEach((el, row) => {
    A[row][row] += 1;                                   // out - (...) = 0
    const into = edgesInto(p, el.id);
    if (el.kind === 'sum') {
      for (const w of into) addTerm(row, wireSignal(p, w), w.sign === '-' ? -1 : 1);
    } else if (el.kind === 'gain') {
      addTerm(row, wireSignal(p, into[0]), parse(el.gain).evaluate(scope));
    } else if (el.kind === 'fn') {
      // Linearize: partial derivative w.r.t. each input at the operating point.
      const f = parse(el.fn).compile();
      const at = { ...params };
      for (const [sig, opName] of Object.entries(p.op ?? {})) at[sig] = params[opName];
      for (const w of into) {
        const sig = wireSignal(p, w);
        const h = 1e-6 * Math.max(1, Math.abs(at[sig]));
        const d = (f.evaluate({ ...at, [sig]: at[sig] + h }) - f.evaluate({ ...at, [sig]: at[sig] - h })) / (2 * h);
        addTerm(row, sig, d);
      }
    }
  });
  const x = lusolve(A, b).map((r) => r[0]);
  return Object.fromEntries(unknowns.map((u, i) => [u, x[i]]));
}

function randomParams(p, rand) {
  const names = new Set();
  for (const el of p.elements) {
    const text = el.kind === 'gain' ? el.gain : el.kind === 'fn' ? el.fn : '';
    if (text) for (const n of symbolsIn(text)) names.add(n);
  }
  for (const t of p.targets) for (const v of t.vars) names.add(v);
  for (const sig of allSignals(p)) names.delete(sig);
  names.delete('s');
  const params = {};
  for (const n of names) params[n] = 0.5 + 2 * rand();
  // An operating angle near 90 degrees makes cos ~ 0; keep it well away so a
  // wrong slope cannot pass by being multiplied by nearly nothing.
  if ('theta_op' in params) params.theta_op = 0.2 + 0.9 * rand();
  if ('x_op' in params) params.x_op = 0.2 + 0.7 * rand();
  return params;
}

function checkTargets(p) {
  const rand = rng(p.id.length * 97 + 3);
  for (const [k, t] of p.targets.entries()) {
    const name = `${p.id} target ${k + 1} (${t.kind}${t.state ? ' ' + t.state : ''}${t.out ? ' ' + t.out + '/' + t.in : ''}${t.wrt ? ' d/d' + t.wrt : ''})`;
    const truth = targetTruth(p, t);
    const needed = symbolsIn(truth);
    report.check(`${name}: allowed symbols cover the answer`, needed.every((s) => t.vars.includes(s)),
                 `needs ${needed} allowed ${t.vars}`);
    report.check(`${name}: UI checker accepts the true answer`,
                 checkTarget(p, t, truth).status === 'correct');
    if (t.display) {
      report.check(`${name}: tidy display form equals the graph derivation`,
                   equivalent(t.display, truth), `${t.display} vs ${truth}`);
    }
    if (t.kind === 'state') {
      report.check(`${name}: state rows carry a display form`, !!t.display);
    }

    if (t.kind === 'tf') {
      let ok = true, detail = '';
      for (let trial = 0; trial < 6 && ok; trial++) {
        const params = randomParams(p, rand);
        const s = 0.3 + 2.5 * rand();
        const inputs = Object.fromEntries(Object.keys(p.inputs).map((u) => [u, u === t.in ? 1 : 0]));
        const sol = linearSolve(p, s, params, inputs);
        const stated = parse(t.answer).evaluate({ ...params, s });
        if (!near(sol[t.out], stated, 1e-7)) { ok = false; detail = `solve ${sol[t.out]} vs stated ${stated}`; }
      }
      report.check(`${name}: stated transfer function matches linear solve of the graph`, ok, detail);
    }

    if (t.kind === 'state' && !p.op) {
      // Linear systems: s*X from the solve must equal the stated row evaluated
      // at the solution -- ties the time-domain row to the Laplace graph.
      let ok = true;
      for (let trial = 0; trial < 4 && ok; trial++) {
        const params = randomParams(p, rand);
        const s = 0.3 + 2.5 * rand();
        const inputs = Object.fromEntries(Object.keys(p.inputs).map((u) => [u, 0.5 + rand()]));
        const sol = linearSolve(p, s, params, inputs);
        const row = parse(truth).evaluate({ ...params, ...inputs, ...sol });
        if (!near(s * sol[t.state], row, 1e-7)) ok = false;
      }
      report.check(`${name}: state row consistent with the Laplace-domain graph`, ok);
    }

    if (t.kind === 'slope') {
      const el = elementById(p, t.element);
      const f = parse(el.fn).compile();
      let ok = true, detail = '';
      for (let trial = 0; trial < 6 && ok; trial++) {
        const params = randomParams(p, rand);
        const at = { ...params };
        for (const [sig, opName] of Object.entries(p.op)) at[sig] = params[opName];
        const h = 1e-6;
        const d = (f.evaluate({ ...at, [t.wrt]: at[t.wrt] + h }) - f.evaluate({ ...at, [t.wrt]: at[t.wrt] - h })) / (2 * h);
        const stated = parse(t.answer).evaluate(params);
        if (!near(d, stated, 1e-5)) { ok = false; detail = `finite diff ${d} vs stated ${stated}`; }
      }
      report.check(`${name}: stated slope matches finite difference`, ok, detail);
    }

    if (t.kind === 'equilibrium') {
      let ok = true, detail = '';
      for (let trial = 0; trial < 6 && ok; trial++) {
        const params = randomParams(p, rand);
        const scope = { ...params };
        for (const [sig, val] of Object.entries(t.at)) scope[sig] = parse(val).evaluate(params);
        for (const u of Object.keys(p.inputs)) if (!(u in scope)) scope[u] = 0;
        scope[t.input] = parse(t.answer).evaluate(params);
        const deriv = parse(derive(p, integratorInput(p, t.state), stateExpansionSet(p))).evaluate(scope);
        if (Math.abs(deriv) > 1e-9) { ok = false; detail = `state derivative ${deriv}`; }
      }
      report.check(`${name}: stated input holds the operating point (derivative = 0)`, ok, detail);
    }
  }
}

/* ------------------------------------------------------------------------ */

// The checker itself: equivalent forms must pass, near-misses must not.
report.check('checker: accepts a rearranged equivalent', equivalent('a*(b + c)/d', 'a*b/d + c*a/d'));
report.check('checker: rejects a sign error', !equivalent('a - b', 'a + b'));
report.check('checker: rejects a missing factor', !equivalent('a/(b*s)', 'a/b'));
report.check('checker: scope overrides mathjs constants (pi, e, i)',
             equivalent('pi + e', 'e + pi') && !equivalent('pi', '3.14159'));

for (const p of problems) {
  checkStructure(p);
  checkGeometry(p);
  checkRegions(p);
  checkTargets(p);
}

// The feedback tuner's diagram: same structural and geometric checks, and the
// state equation it displays must be what the drawing actually says.
checkStructure({ ...feedbackDiagram, regions: [{ n: 0, members: feedbackDiagram.elements.map((e) => e.id) }] });
checkGeometry({ ...feedbackDiagram, regions: [] });
{
  const truth = derive(feedbackDiagram, integratorInput(feedbackDiagram, 'v'), stateExpansionSet(feedbackDiagram));
  report.check('msd-feedback: displayed velocity equation equals the drawn graph',
               equivalent(feedbackDiagram.velocityRow, truth), `${feedbackDiagram.velocityRow} vs ${truth}`);
  const wrong = feedbackDiagram.velocityRow.replace('(C_p + C_a)', '(C_p - C_a)');
  report.check('msd-feedback: check is sensitive to an active-gain sign', !equivalent(wrong, truth));
}

console.log('\nDiagram problem verification');
report.print();
const failed = report.failures.length;
console.log(`\n${report.results.length - failed}/${report.results.length} checks passed`);
if (failed) {
  console.error(`\n${failed} FAILURE(S)`);
  process.exit(1);
}
