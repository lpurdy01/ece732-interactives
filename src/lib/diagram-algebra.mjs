/**
 * Block diagram -> equations, computed from the drawing itself.
 *
 * A practice diagram is stored as a signal graph, not as a picture with answers
 * attached. Every block, junction and wire is semantic: a wire names its source
 * and destination, a junction input carries its sign, a block carries its gain.
 * The equation for any region of the diagram is then *derived* from that graph,
 * which means the drawing and the answer cannot disagree -- the failure mode
 * where a sign is drawn one way and the answer key says the other.
 *
 * The same derivation powers the feedback. A wrong answer is compared against
 * deliberately broken copies of the graph (one junction sign flipped, one input
 * dropped, one block left out or inverted), so the tool can say *which* part of
 * the diagram was misread rather than just "incorrect".
 *
 * Plain JavaScript (not TypeScript) so the Node verification script can import
 * it directly: verify/verify-diagram-problems.mjs checks every problem's stated
 * answers against this derivation and against an independent linear solve.
 */

import { parse } from 'mathjs';

/** Functions a typed answer may call. Anything else is an unknown symbol. */
export const ALLOWED_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'sqrt', 'exp', 'abs']);

/* ------------------------------------------------------------------------ */
/* Graph queries                                                             */
/* ------------------------------------------------------------------------ */

export function elementById(problem, id) {
  return problem.elements.find((e) => e.id === id);
}

/** The element whose output is `signal`, or undefined for an external input. */
export function producerOf(problem, signal) {
  return problem.elements.find((e) => e.out === signal);
}

/** Signal name carried by a wire's source (an element id or an input name). */
export function wireSignal(problem, wire) {
  const el = elementById(problem, wire.src);
  if (el) return el.out;
  if (problem.inputs && wire.src in problem.inputs) return wire.src;
  throw new Error(`${problem.id}: wire source '${wire.src}' is neither an element nor an input`);
}

/** Wires arriving at an element, in drawing order (which fixes term order). */
export function edgesInto(problem, elementId) {
  return problem.wires.filter((w) => w.dst === elementId);
}

export function isIntegrator(el) {
  return el && el.kind === 'gain' && el.gain.replace(/\s+/g, '') === '1/s';
}

/** Signals that enter a set of elements from outside it. */
export function regionInputs(problem, members) {
  const inside = new Set(members);
  const seen = [];
  for (const id of members) {
    for (const w of edgesInto(problem, id)) {
      if (inside.has(w.src)) continue;
      const sig = wireSignal(problem, w);
      if (!seen.includes(sig)) seen.push(sig);
    }
  }
  return seen;
}

/** Signals produced strictly inside a region (everything but its output). */
export function regionInternals(problem, members, output) {
  return members.map((id) => elementById(problem, id).out).filter((s) => s !== output);
}

/** Parameter symbols (not signals, not s) appearing in a set of blocks. */
export function regionParams(problem, members) {
  const signals = new Set(allSignals(problem));
  const params = [];
  let usesS = false;
  for (const id of members) {
    const el = elementById(problem, id);
    const text = el.kind === 'gain' ? el.gain : el.kind === 'fn' ? el.fn : '';
    if (!text) continue;
    for (const name of symbolsIn(text)) {
      if (name === 's') { usesS = true; continue; }
      if (signals.has(name)) continue;
      if (!params.includes(name)) params.push(name);
    }
  }
  return { params, usesS };
}

export function allSignals(problem) {
  return [...Object.keys(problem.inputs ?? {}), ...problem.elements.map((e) => e.out)];
}

/** Free symbol names in an expression string (function names excluded). */
export function symbolsIn(text) {
  const names = new Set();
  parse(text).traverse((node, path, parent) => {
    if (node.type !== 'SymbolNode') return;
    if (parent && parent.type === 'FunctionNode' && path === 'fn') return;
    names.add(node.name);
  });
  return [...names];
}

/* ------------------------------------------------------------------------ */
/* Deriving an expression from the graph                                     */
/* ------------------------------------------------------------------------ */

/**
 * Expression for `signal`, expanding every element in `expand` and leaving any
 * other signal as a symbol.
 *
 * `mutation` breaks the graph on purpose, for diagnosing a wrong answer:
 *   { flip: wire }          that junction input's sign is reversed
 *   { drop: wire }          that junction input is removed
 *   { gain: [id, text] }    that block's gain is replaced
 */
export function derive(problem, signal, expand, mutation = {}) {
  const el = producerOf(problem, signal);
  if (!el || !expand.has(el.id)) return signal;
  const sub = (sig) => derive(problem, sig, expand, mutation);

  if (el.kind === 'sum') {
    const terms = edgesInto(problem, el.id)
      .filter((w) => w !== mutation.drop)
      .map((w) => {
        let sign = w.sign === '-' ? -1 : 1;
        if (w === mutation.flip) sign = -sign;
        return `${sign < 0 ? '-' : '+'}(${sub(wireSignal(problem, w))})`;
      });
    return terms.length ? `(${terms.join(' ')})` : '0';
  }

  if (el.kind === 'gain') {
    const [input] = edgesInto(problem, el.id);
    const gain = mutation.gain && mutation.gain[0] === el.id ? mutation.gain[1] : el.gain;
    return `((${gain}) * (${sub(wireSignal(problem, input))}))`;
  }

  if (el.kind === 'fn') {
    const inputs = new Map(edgesInto(problem, el.id)
      .map((w) => [wireSignal(problem, w), w]));
    const tree = parse(el.fn).transform((node, path, parent) => {
      if (node.type === 'SymbolNode' && inputs.has(node.name)
          && !(parent && parent.type === 'FunctionNode' && path === 'fn')) {
        return parse(`(${sub(node.name)})`);
      }
      return node;
    });
    return `(${tree.toString()})`;
  }

  throw new Error(`${problem.id}: unknown element kind '${el.kind}'`);
}

/** Every non-integrator element: expanding these leaves states and inputs. */
export function stateExpansionSet(problem) {
  return new Set(problem.elements.filter((e) => !isIntegrator(e)).map((e) => e.id));
}

/** The signal feeding the integrator whose output is `state`. */
export function integratorInput(problem, state) {
  const el = producerOf(problem, state);
  if (!isIntegrator(el)) throw new Error(`${problem.id}: '${state}' is not an integrator output`);
  return wireSignal(problem, edgesInto(problem, el.id)[0]);
}

/* ------------------------------------------------------------------------ */
/* Numerical equivalence                                                     */
/* ------------------------------------------------------------------------ */

/** Deterministic PRNG so a verification run is reproducible. */
export function rng(seed = 12345) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Are two expressions the same function of their symbols?
 *
 * Evaluated at random points rather than simplified symbolically: algebraic
 * simplification is where a checker quietly rejects a correct answer written
 * in a different arrangement. Values are drawn from [0.4, 2.4] so square roots
 * stay real and nothing sits on a pole; two different rational expressions
 * agreeing to 1e-9 at eight random points is not a coincidence.
 */
export function equivalent(a, b, { trials = 8, seed = 7, scope = {} } = {}) {
  const fa = typeof a === 'string' ? parse(a).compile() : a;
  const fb = typeof b === 'string' ? parse(b).compile() : b;
  const names = new Set([
    ...(typeof a === 'string' ? symbolsIn(a) : []),
    ...(typeof b === 'string' ? symbolsIn(b) : []),
  ]);
  const rand = rng(seed);
  let compared = 0;
  for (let t = 0; t < trials * 3 && compared < trials; t++) {
    const point = { ...scope };
    for (const n of names) if (!(n in scope)) point[n] = 0.4 + 2 * rand();
    let va, vb;
    try { va = fa.evaluate(point); vb = fb.evaluate(point); } catch { return false; }
    if (typeof va !== 'number' || typeof vb !== 'number') return false;
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    const scale = Math.max(1, Math.abs(va), Math.abs(vb));
    if (Math.abs(va - vb) > 1e-9 * scale) return false;
    compared++;
  }
  return compared >= Math.min(trials, 3);
}

/* ------------------------------------------------------------------------ */
/* Checking a typed answer                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Check a student's expression for a region's output.
 *
 * Returns { status: 'correct' | 'wrong' | 'invalid', message, hint? }.
 * `pretty(signal)` turns a signal name into display text for messages.
 */
export function checkRegionAnswer(problem, region, typed, pretty = (s) => s) {
  const members = region.members;
  const expand = new Set(members);
  const truth = derive(problem, region.out, expand);
  const inputs = regionInputs(problem, members);
  const internals = regionInternals(problem, members, region.out);
  const { params, usesS } = regionParams(problem, members);
  const allowed = new Set([...inputs, ...params, ...(usesS ? ['s'] : [])]);

  const parsed = readExpression(typed, region.out);
  if (parsed.error) return { status: 'invalid', message: parsed.error };

  const signals = new Set(allSignals(problem));
  for (const name of parsed.symbols) {
    if (allowed.has(name)) continue;
    if (name === region.out) {
      return { status: 'invalid', message: `The output ${pretty(name)} can't appear on the right-hand side — write it in terms of what enters the region.` };
    }
    if (internals.includes(name)) {
      return { status: 'invalid', message: `${pretty(name)} is a signal inside this region. Carry on through the block that produces it, back to the signals entering the region.` };
    }
    if (signals.has(name)) {
      return { status: 'invalid', message: `${pretty(name)} doesn't enter this region. The inputs are ${inputs.map(pretty).join(', ')}.` };
    }
    if (name === 's') {
      return { status: 'invalid', message: 'There is no integrator in this region, so s should not appear.' };
    }
    return { status: 'invalid', message: `Unknown symbol “${name}”. Use the symbol buttons for the exact spelling.` };
  }

  if (equivalent(parsed.text, truth)) return { status: 'correct', message: 'Correct.' };

  const diagnosis = diagnose(problem, region, parsed.text, pretty);
  return { status: 'wrong', message: diagnosis ?? 'Not equivalent yet. Trace each input into the region and apply the blocks in order.' };
}

/** Parse "expr" or "lhs = expr". Returns { text, symbols } or { error }. */
export function readExpression(typed, lhsName) {
  let text = String(typed ?? '').trim();
  if (!text) return { error: 'Type an expression first.' };
  const eq = text.indexOf('=');
  if (eq >= 0) {
    const left = text.slice(0, eq).trim();
    if (lhsName && left && left !== lhsName) {
      return { error: `Only the right-hand side is needed (the left side is fixed).` };
    }
    text = text.slice(eq + 1).trim();
  }
  text = text.replace(/·|×/g, '*').replace(/−/g, '-');
  let node;
  try { node = parse(text); } catch (err) {
    // The parser's message can quote the input, and messages are shown as HTML.
    const detail = err.message.replace(/\(char \d+\)/, '').trim().replace(/[<>&]/g, (c) => `&#${c.charCodeAt(0)};`);
    return { error: `Couldn't read that: ${detail}.` };
  }
  const symbols = [];
  let badFn = null;
  node.traverse((n, path, parent) => {
    if (n.type === 'FunctionNode' && !ALLOWED_FUNCTIONS.has(n.fn.name)) badFn = n.fn.name;
    if (n.type !== 'SymbolNode') return;
    if (parent && parent.type === 'FunctionNode' && path === 'fn') return;
    if (!symbols.includes(n.name)) symbols.push(n.name);
  });
  if (badFn) {
    return { error: `“${badFn}(…)” reads as a function call. Put a * between a symbol and a bracket: ${badFn}*(…).` };
  }
  return { text, symbols, node };
}

/**
 * Try the common misreadings of this region and name the first that matches.
 * Order matters: a sign error is more likely, and more useful to name, than a
 * dropped input.
 */
export function diagnose(problem, region, text, pretty = (s) => s) {
  const expand = new Set(region.members);
  const same = (mutation) => equivalent(text, derive(problem, region.out, expand, mutation));

  const junctions = region.members.map((id) => elementById(problem, id)).filter((e) => e.kind === 'sum');
  const blocks = region.members.map((id) => elementById(problem, id)).filter((e) => e.kind === 'gain');

  for (const j of junctions) {
    for (const w of edgesInto(problem, j.id)) {
      if (same({ flip: w })) {
        const sig = pretty(wireSignal(problem, w));
        return `Check the sign where ${sig} enters the summing junction — it is marked “${w.sign === '-' ? '−' : '+'}”.`;
      }
    }
  }
  if (equivalent(`-(${text})`, derive(problem, region.out, expand))) {
    return 'Every term has the opposite sign.';
  }
  for (const j of junctions) {
    for (const w of edgesInto(problem, j.id)) {
      if (same({ drop: w })) {
        return `You're missing the ${pretty(wireSignal(problem, w))} input to the junction.`;
      }
    }
  }
  for (const b of blocks) {
    const name = b.name ?? b.gain;
    if (same({ gain: [b.id, '1'] })) {
      return isIntegrator(b)
        ? 'The integrator (1/s) is missing.'
        : `The ${name} block has been left out.`;
    }
    if (same({ gain: [b.id, `1/(${b.gain})`] })) {
      return isIntegrator(b)
        ? 'That multiplies by s — differentiating. A 1/s block integrates, so it divides by s.'
        : `The ${name} block is inverted: a block multiplies its input by exactly what is written inside it.`;
    }
  }
  return null;
}

/** Check a whole-system target (state row, transfer function, slope). */
export function checkTarget(problem, target, typed, pretty = (s) => s) {
  const parsed = readExpression(typed, null);
  if (parsed.error) return { status: 'invalid', message: parsed.error };
  const allowed = new Set(target.vars);
  for (const name of parsed.symbols) {
    if (!allowed.has(name)) {
      const hint = allSignals(problem).includes(name)
        ? `${pretty(name)} is an intermediate signal — eliminate it.`
        : name === 's' ? 's does not belong in this answer.'
        : `Unknown symbol “${name}”.`;
      return { status: 'invalid', message: `${hint} Allowed: ${target.vars.map(pretty).join(', ')}.` };
    }
  }
  const truth = targetTruth(problem, target);
  if (equivalent(parsed.text, truth)) return { status: 'correct', message: 'Correct.' };
  if (equivalent(`-(${parsed.text})`, truth)) return { status: 'wrong', message: 'Right magnitude, opposite sign.' };
  return { status: 'wrong', message: target.miss ?? 'Not equivalent yet.' };
}

/**
 * The expression a target is checked against.
 *
 * State rows come straight from the graph (expand everything except the
 * integrators). Transfer functions and slopes use the stated answer, which
 * verify/verify-diagram-problems.mjs checks independently by linear solve and
 * by finite difference -- so no answer shown here is merely asserted.
 */
export function targetTruth(problem, target) {
  if (target.kind === 'state') {
    return derive(problem, integratorInput(problem, target.state), stateExpansionSet(problem));
  }
  return target.answer;
}

/* ------------------------------------------------------------------------ */
/* TeX printing                                                              */
/* ------------------------------------------------------------------------ */

/**
 * mathjs's own toTex output is hard to read (\left( everywhere, \mathrm on
 * single letters, escaped underscores). This printer is small because the
 * expressions are: sums, products, quotients, powers and a few functions.
 */
export function toTex(input, symbols = {}) {
  const node = typeof input === 'string' ? parse(input) : input;
  return tex(node, symbols);
}

function symbolTex(name, symbols) {
  if (symbols[name]?.tex) return symbols[name].tex;
  const greek = ['alpha', 'beta', 'gamma', 'delta', 'theta', 'omega', 'tau', 'phi', 'rho', 'zeta'];
  const m = name.match(/^([A-Za-z]+?)(\d*)(?:_(.+))?$/);
  if (!m) return name;
  let [, base, digits, sub] = m;
  if (greek.includes(base)) base = `\\${base}`;
  const subscript = [digits, sub].filter(Boolean).join(',');
  return subscript ? `${base}_{${subscript.replace(/_/g, ',')}}` : base;
}

const strip = (n) => (n.type === 'ParenthesisNode' ? strip(n.content) : n);
const isSum = (n) => n.type === 'OperatorNode' && (n.fn === 'add' || n.fn === 'subtract');

function tex(node, symbols) {
  const t = (n) => tex(n, symbols);
  switch (node.type) {
    case 'ConstantNode': return String(node.value);
    case 'SymbolNode': return symbolTex(node.name, symbols);
    case 'ParenthesisNode': {
      const inner = strip(node.content);
      if (inner.type === 'SymbolNode' || inner.type === 'ConstantNode' || inner.type === 'FunctionNode') return t(inner);
      return `\\left(${t(inner)}\\right)`;
    }
    case 'FunctionNode': {
      // sin() parses fine but has no argument; the live preview must not throw.
      if (node.args.length === 0) return `\\operatorname{${node.fn.name}}()`;
      const args = node.args.map((a) => t(strip(a))).join(', ');
      const name = node.fn.name;
      if (name === 'sqrt') return `\\sqrt{${args}}`;
      if (name === 'abs') return `\\left|${args}\\right|`;
      if (['sin', 'cos', 'tan', 'exp'].includes(name)) {
        const a = strip(node.args[0]);
        return a.type === 'SymbolNode' ? `\\${name}${args.startsWith('\\') ? ' ' : ' '}${args}` : `\\${name}\\left(${args}\\right)`;
      }
      return `\\operatorname{${name}}\\left(${args}\\right)`;
    }
    case 'OperatorNode': {
      const [a, b] = node.args;
      switch (node.fn) {
        case 'add': return `${t(a)} + ${t(b)}`;
        case 'subtract': {
          const right = strip(b);
          return `${t(a)} - ${isSum(right) ? `\\left(${t(right)}\\right)` : t(b)}`;
        }
        case 'unaryMinus': {
          const inner = strip(a);
          return `-${isSum(inner) ? `\\left(${t(inner)}\\right)` : t(a)}`;
        }
        case 'unaryPlus': return t(a);
        case 'multiply': {
          const wrap = (n) => (isSum(strip(n)) ? `\\left(${t(strip(n))}\\right)` : t(n));
          return `${wrap(a)}\\,${wrap(b)}`;
        }
        case 'divide': return `\\frac{${t(strip(a))}}{${t(strip(b))}}`;
        case 'pow': {
          const base = strip(a);
          const bt = base.type === 'SymbolNode' || base.type === 'ConstantNode' ? t(base) : `\\left(${t(base)}\\right)`;
          return `${bt}^{${t(strip(b))}}`;
        }
        default: return node.toTex();
      }
    }
    default: return node.toTex();
  }
}

/* ------------------------------------------------------------------------ */
/* Sign table                                                                */
/* ------------------------------------------------------------------------ */

/** For each junction: the signs in drawing order and the signals they apply to. */
export function signTable(problem) {
  return problem.elements.filter((e) => e.kind === 'sum').map((j) => {
    const edges = edgesInto(problem, j.id);
    return {
      junction: j.id,
      out: j.out,
      signs: edges.map((w) => (w.sign === '-' ? '−' : '+')).join(''),
      terms: edges.map((w) => ({ sign: w.sign === '-' ? '-' : '+', signal: wireSignal(problem, w) })),
      region: problem.regions.find((r) => r.members.includes(j.id))?.n,
    };
  });
}
