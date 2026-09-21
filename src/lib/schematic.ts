/**
 * Physical schematics -- circuits, shafts and mass-spring-dampers -- as SVG.
 *
 * The block diagrams on this site come from `diagram-svg.ts`, which draws a
 * signal graph. That answers "how does the maths flow"; it does not answer
 * "which resistor is R_p". This module draws the other half: the device, with
 * every symbol that appears on a slider drawn where it physically sits.
 *
 * Both halves tag their parts with `data-sym`, so a component can light up the
 * same quantity in both pictures at once, and write live values into
 * `data-val` slots. That correspondence is the entire point -- see
 * `figures.ts` for the definitions and `SystemFigures.astro` for the shell.
 *
 * Coordinates are SVG user units with y down. A two-terminal part is centred
 * on (x, y) and spans `len` along `dir`, so a wire drawn to its endpoints
 * always meets it. Colours come from CSS classes: custom properties do not
 * resolve inside SVG presentation attributes and the site has a dark theme.
 */

import { markup } from './diagram-svg';

export type Pt = [number, number];
export type Dir = 'h' | 'v';

/** Default end-to-end length of a two-terminal part, leads included. */
export const PART_LEN = 48;
/** Length of the drawn body; the rest is lead wire. */
const BODY = 26;

export interface Part {
  kind: 'R' | 'L' | 'C' | 'isrc' | 'vsrc' | 'box' | 'disc' | 'mass' | 'spring' | 'damper';
  x: number;
  y: number;
  dir?: Dir;
  len?: number;
  /** Symbol markup drawn beside the part, e.g. "R_{p}". */
  label?: string;
  /** Key shared with the block diagram and the sliders; enables highlighting. */
  sym?: string;
  /** Which side of the part the label sits on: 1 is below/right, -1 above/left. */
  side?: 1 | -1;
  /** Reserve a second label line for a live value written into `data-val`. */
  value?: boolean;
  /** Body size for `box`, `mass` and `disc` (disc uses w as its radius). */
  w?: number;
  h?: number;
  /** Arrow direction inside a source symbol, +1 along dir, -1 against it. */
  flow?: 1 | -1;
  /** Muted styling: the part is present but not the subject. */
  tone?: 'muted' | 'active';
}

export interface Wire {
  pts: Pt[];
  tone?: 'muted' | 'active';
  /** Draw a dashed line rather than solid (a signal path, not a conductor). */
  dashed?: boolean;
}

export interface Marker {
  /** Current arrow along a wire, or torque arrow on a shaft. */
  kind: 'current' | 'torque' | 'force' | 'couple' | 'volt' | 'node' | 'ground' | 'hatch';
  x: number;
  y: number;
  dir?: Dir;
  /** Arrow length, or for `volt` the distance between the + and - signs. */
  len?: number;
  label?: string;
  sym?: string;
  value?: boolean;
  flow?: 1 | -1;
  side?: 1 | -1;
  tone?: 'muted' | 'active';
}

export interface Schematic {
  viewBox: [number, number, number, number];
  wires?: Wire[];
  parts?: Part[];
  markers?: Marker[];
  /** Free text: node names, annotations, brace captions. */
  labels?: { x: number; y: number; text: string; sym?: string; anchor?: string; tone?: 'muted' | 'active'; small?: boolean }[];
  /** A dashed enclosure, e.g. "everything inside here is the controller". */
  boxes?: { x: number; y: number; w: number; h: number; label?: string; sym?: string; tone?: 'muted' | 'active' }[];
  title: string;
}

const n = (v: number) => (Math.round(v * 10) / 10).toString();

function tone(t?: string): string {
  return t ? ` fx-tone-${t}` : '';
}

function symAttr(sym?: string): string {
  return sym ? ` data-sym="${sym}"` : '';
}

/**
 * Symbol text, optionally with a live-value line under it.
 *
 * The value line is a separate <text> so a component can overwrite it without
 * reflowing the symbol, and it is left empty here: a figure rendered at build
 * time must not claim a number the page has not computed yet.
 */
function labelSvg(
  x: number, y: number, text: string, opts: { sym?: string; value?: boolean; anchor?: string; tone?: string; small?: boolean } = {},
): string {
  const anchor = opts.anchor ?? 'middle';
  const cls = `fx-sym${opts.small ? ' fx-small' : ''}${tone(opts.tone)}`;
  let out = `<text class="${cls}" x="${n(x)}" y="${n(y)}" text-anchor="${anchor}">${markup(text)}</text>`;
  if (opts.value && opts.sym) {
    out += `<text class="fx-val" data-val="${opts.sym}" x="${n(x)}" y="${n(y + 13)}" text-anchor="${anchor}"></text>`;
  }
  return `<g class="fx-label"${symAttr(opts.sym)}>${out}</g>`;
}

/**
 * Points along a part's axis: [start, bodyStart, bodyEnd, end].
 *
 * The body grows with the span rather than staying at BODY, or a spring drawn
 * across 130 units renders as a thumbnail zigzag with two long leads.
 */
function axis(p: Part): { a: Pt; b: Pt; c: Pt; d: Pt; body: number; horiz: boolean } {
  const len = p.len ?? PART_LEN;
  const horiz = (p.dir ?? 'h') === 'h';
  const body = Math.max(BODY, Math.min(len * 0.55, 76));
  const half = len / 2, hb = body / 2;
  const at = (t: number): Pt => (horiz ? [p.x + t, p.y] : [p.x, p.y + t]);
  return { a: at(-half), b: at(-hb), c: at(hb), d: at(half), body, horiz };
}

function leads(a: Pt, b: Pt, c: Pt, d: Pt, t?: string): string {
  return `<polyline class="fx-wire${tone(t)}" points="${a.join(',')} ${b.join(',')}"/>`
    + `<polyline class="fx-wire${tone(t)}" points="${c.join(',')} ${d.join(',')}"/>`;
}

/** Where a part's label goes: beside the body, on the requested side. */
function labelPos(p: Part, horiz: boolean, gap: number): { x: number; y: number; anchor: string } {
  const side = p.side ?? -1;
  if (horiz) {
    // A value line hangs below its symbol, so a label sitting above a
    // horizontal part has to start a line higher or the value lands on the wire.
    const lift = p.value && side < 0 ? 13 : 0;
    return { x: p.x, y: p.y + side * gap + (side > 0 ? 11 : -lift), anchor: 'middle' };
  }
  return { x: p.x + side * gap, y: p.y + 4, anchor: side > 0 ? 'start' : 'end' };
}

function resistor(p: Part): string {
  const { a, b, c, d, body, horiz } = axis(p);
  const amp = 7, segs = 6;
  const pts: Pt[] = [b];
  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs;
    const off = i % 2 === 0 ? -amp : amp;
    pts.push(horiz ? [b[0] + t * body, p.y + off] : [p.x + off, b[1] + t * body]);
  }
  pts.push(c);
  return leads(a, b, c, d, p.tone)
    + `<polyline class="fx-body${tone(p.tone)}" points="${pts.map((q) => `${n(q[0])},${n(q[1])}`).join(' ')}"/>`;
}

function inductor(p: Part): string {
  const { a, b, c, d, body, horiz } = axis(p);
  const coils = 4, r = body / (2 * coils);
  let path = `M ${n(b[0])} ${n(b[1])}`;
  for (let i = 0; i < coils; i++) {
    // sweep 1 bulges up for a horizontal part, left for a vertical one, which
    // is the orientation both are conventionally drawn in.
    path += horiz ? ` a ${n(r)} ${n(r)} 0 0 1 ${n(2 * r)} 0` : ` a ${n(r)} ${n(r)} 0 0 0 0 ${n(2 * r)}`;
  }
  return leads(a, b, c, d, p.tone) + `<path class="fx-body${tone(p.tone)}" d="${path}"/>`;
}

function capacitor(p: Part): string {
  const len = p.len ?? PART_LEN;
  const horiz = (p.dir ?? 'h') === 'h';
  const gap = 5, plate = 15;
  const at = (t: number): Pt => (horiz ? [p.x + t, p.y] : [p.x, p.y + t]);
  const p1 = at(-gap), p2 = at(gap);
  const perp = (q: Pt, s: number): Pt => (horiz ? [q[0], q[1] + s] : [q[0] + s, q[1]]);
  const plateLine = (q: Pt) =>
    `<polyline class="fx-body${tone(p.tone)}" points="${perp(q, -plate).join(',')} ${perp(q, plate).join(',')}"/>`;
  return `<polyline class="fx-wire${tone(p.tone)}" points="${at(-len / 2).join(',')} ${p1.join(',')}"/>`
    + `<polyline class="fx-wire${tone(p.tone)}" points="${p2.join(',')} ${at(len / 2).join(',')}"/>`
    + plateLine(p1) + plateLine(p2);
}

function arrowHead(from: Pt, to: Pt, cls: string): string {
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const l = 8, half = 0.4;
  const q1: Pt = [to[0] - l * Math.cos(ang - half), to[1] - l * Math.sin(ang - half)];
  const q2: Pt = [to[0] - l * Math.cos(ang + half), to[1] - l * Math.sin(ang + half)];
  return `<polygon class="${cls}" points="${n(to[0])},${n(to[1])} ${n(q1[0])},${n(q1[1])} ${n(q2[0])},${n(q2[1])}"/>`;
}

function source(p: Part, current: boolean): string {
  const len = p.len ?? PART_LEN;
  const horiz = (p.dir ?? 'h') === 'h';
  const r = 15;
  const at = (t: number): Pt => (horiz ? [p.x + t, p.y] : [p.x, p.y + t]);
  const flow = p.flow ?? 1;
  let inner = '';
  if (current) {
    const from = at(-r * 0.6 * flow), to = at(r * 0.72 * flow);
    inner = `<polyline class="fx-body${tone(p.tone)}" points="${from.join(',')} ${to.join(',')}"/>`
      + arrowHead(from, to, `fx-head${tone(p.tone)}`);
  } else {
    // + on the terminal the flow arrow would point at, so a voltage and a
    // current source drawn with the same `flow` agree on which way is positive.
    const plus = at(r * 0.55 * flow), minus = at(-r * 0.55 * flow);
    inner = `<text class="fx-pol" x="${n(plus[0])}" y="${n(plus[1] + 5)}" text-anchor="middle">+</text>`
      + `<text class="fx-pol" x="${n(minus[0])}" y="${n(minus[1] + 5)}" text-anchor="middle">−</text>`;
  }
  return `<polyline class="fx-wire${tone(p.tone)}" points="${at(-len / 2).join(',')} ${at(-r).join(',')}"/>`
    + `<polyline class="fx-wire${tone(p.tone)}" points="${at(r).join(',')} ${at(len / 2).join(',')}"/>`
    + `<circle class="fx-face${tone(p.tone)}" cx="${n(p.x)}" cy="${n(p.y)}" r="${r}"/>` + inner;
}

function boxPart(p: Part): string {
  const w = p.w ?? 70, h = p.h ?? 46;
  return `<rect class="fx-face${tone(p.tone)}" x="${n(p.x - w / 2)}" y="${n(p.y - h / 2)}" width="${w}" height="${h}" rx="4"/>`;
}

/** A rotating inertia: a disc on a shaft, drawn end-on. */
function disc(p: Part): string {
  const r = p.w ?? 22;
  return `<circle class="fx-face${tone(p.tone)}" cx="${n(p.x)}" cy="${n(p.y)}" r="${r}"/>`
    + `<circle class="fx-hub${tone(p.tone)}" cx="${n(p.x)}" cy="${n(p.y)}" r="4"/>`;
}

function spring(p: Part): string {
  const { a, b, c, d, body, horiz } = axis(p);
  const amp = 9, segs = 8;
  const pts: Pt[] = [b];
  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs;
    const off = i % 2 === 0 ? -amp : amp;
    pts.push(horiz ? [b[0] + t * body, p.y + off] : [p.x + off, b[1] + t * body]);
  }
  pts.push(c);
  return leads(a, b, c, d, p.tone)
    + `<polyline class="fx-body${tone(p.tone)}" points="${pts.map((q) => `${n(q[0])},${n(q[1])}`).join(' ')}"/>`;
}

/** Dashpot: a cylinder with a piston on one lead. */
function damper(p: Part): string {
  const { a, b, c, d, body, horiz } = axis(p);
  const half = 10;
  const perp = (q: Pt, s: number): Pt => (horiz ? [q[0], q[1] + s] : [q[0] + s, q[1]]);
  const along = (q: Pt, s: number): Pt => (horiz ? [q[0] + s, q[1]] : [q[0], q[1] + s]);
  const cyl = [perp(b, -half), b, perp(b, half)];
  const mid = along(b, body * 0.62);
  return leads(a, b, c, d, p.tone)
    // cup: three sides open toward the piston rod
    + `<polyline class="fx-body${tone(p.tone)}" points="${perp(b, -half).join(',')} ${perp(along(b, body * 0.8), -half).join(',')}"/>`
    + `<polyline class="fx-body${tone(p.tone)}" points="${perp(b, half).join(',')} ${perp(along(b, body * 0.8), half).join(',')}"/>`
    + `<polyline class="fx-body${tone(p.tone)}" points="${cyl.map((q) => q.join(',')).join(' ')}"/>`
    + `<polyline class="fx-body${tone(p.tone)}" points="${perp(mid, -half * 0.8).join(',')} ${perp(mid, half * 0.8).join(',')}"/>`
    + `<polyline class="fx-wire${tone(p.tone)}" points="${mid.join(',')} ${c.join(',')}"/>`;
}

function massPart(p: Part): string {
  const w = p.w ?? 74, h = p.h ?? 52;
  return `<rect class="fx-face${tone(p.tone)}" x="${n(p.x - w / 2)}" y="${n(p.y - h / 2)}" width="${w}" height="${h}"/>`;
}

const PART_DRAW: Record<Part['kind'], (p: Part) => string> = {
  R: resistor,
  L: inductor,
  C: capacitor,
  isrc: (p) => source(p, true),
  vsrc: (p) => source(p, false),
  box: boxPart,
  disc,
  mass: massPart,
  spring,
  damper,
};

/** Label offset from the part centre, per kind. Bigger bodies need more room. */
const LABEL_GAP: Record<Part['kind'], number> = {
  R: 17, L: 17, C: 20, isrc: 22, vsrc: 22, box: 34, disc: 30, mass: 36, spring: 18, damper: 19,
};

function partSvg(p: Part): string {
  const horiz = (p.dir ?? 'h') === 'h';
  let out = PART_DRAW[p.kind](p);
  if (p.label) {
    const inBody = p.kind === 'box' || p.kind === 'mass';
    if (p.kind === 'disc') {
      // A 30-unit disc cannot hold "0.1 g.m2" as well as J, so the symbol goes
      // in the hub's place and the number hangs below the rim.
      out += labelSvg(p.x, p.y - 8, p.label, { sym: p.sym, tone: p.tone });
      if (p.value && p.sym) {
        out += `<text class="fx-val" data-val="${p.sym}" x="${n(p.x)}" y="${n(p.y + (p.w ?? 22) + 26)}" text-anchor="middle"></text>`;
      }
    } else {
      const pos = inBody
        ? { x: p.x, y: p.y + (p.value ? -1 : 5), anchor: 'middle' }
        : labelPos(p, horiz, p.kind === 'box' ? (p.h ?? 46) / 2 + 12 : LABEL_GAP[p.kind]);
      out += labelSvg(pos.x, pos.y, p.label, { sym: p.sym, value: p.value, anchor: pos.anchor, tone: p.tone });
    }
  }
  return `<g class="fx-part fx-${p.kind}"${symAttr(p.sym)}>${out}</g>`;
}

/** Hatched wall: the fixed reference a spring, damper or bearing pushes against. */
function hatch(m: Marker): string {
  const len = m.len ?? 56;
  const horiz = (m.dir ?? 'h') === 'h';
  const side = m.side ?? 1;
  const out: string[] = [];
  const A: Pt = horiz ? [m.x - len / 2, m.y] : [m.x, m.y - len / 2];
  const B: Pt = horiz ? [m.x + len / 2, m.y] : [m.x, m.y + len / 2];
  out.push(`<polyline class="fx-wall" points="${A.join(',')} ${B.join(',')}"/>`);
  const ticks = 7, t = 8;
  for (let i = 0; i < ticks; i++) {
    const f = i / (ticks - 1);
    const x = A[0] + f * (B[0] - A[0]), y = A[1] + f * (B[1] - A[1]);
    // slanted so the hatching reads as a wall rather than a comb
    const dx = horiz ? -t * 0.6 : side * t, dy = horiz ? side * t : -t * 0.6;
    out.push(`<polyline class="fx-wall" points="${n(x)},${n(y)} ${n(x + dx)},${n(y + dy)}"/>`);
  }
  return out.join('');
}

function ground(m: Marker): string {
  const out = [`<polyline class="fx-wire" points="${n(m.x)},${n(m.y)} ${n(m.x)},${n(m.y + 8)}"/>`];
  for (let i = 0; i < 3; i++) {
    const w = 13 - i * 4, y = m.y + 8 + i * 4;
    out.push(`<polyline class="fx-wire" points="${n(m.x - w)},${n(y)} ${n(m.x + w)},${n(y)}"/>`);
  }
  return out.join('');
}

/** A straight arrow with its name beside it: a current, a force, a velocity. */
function flowArrow(m: Marker, cls: string): string {
  const len = m.len ?? 26;
  const horiz = (m.dir ?? 'h') === 'h';
  const flow = m.flow ?? 1;
  const from: Pt = horiz ? [m.x - (flow * len) / 2, m.y] : [m.x, m.y - (flow * len) / 2];
  const to: Pt = horiz ? [m.x + (flow * len) / 2, m.y] : [m.x, m.y + (flow * len) / 2];
  const side = m.side ?? -1;
  const pos = horiz
    ? { x: m.x, y: m.y + (side < 0 ? -11 : 19), anchor: 'middle' }
    : { x: m.x + side * 10, y: m.y + 4, anchor: side > 0 ? 'start' : 'end' };
  return `<g class="fx-flow"${symAttr(m.sym)}>`
    + `<polyline class="${cls}${tone(m.tone)}" points="${from.map(n).join(',')} ${to.map(n).join(',')}"/>`
    + arrowHead(from, to, `fx-head${tone(m.tone)}`)
    + (m.label ? labelSvg(pos.x, pos.y, m.label, { sym: m.sym, value: m.value, anchor: pos.anchor, tone: m.tone }) : '')
    + `</g>`;
}

/** A torque: a curved arrow around the shaft axis. */
function torque(m: Marker): string {
  const r = m.len ?? 26;
  const flow = m.flow ?? 1;
  const a0 = -2.2, a1 = 2.2;
  const s: Pt = [m.x + r * Math.cos(a0), m.y + r * Math.sin(a0)];
  const e: Pt = [m.x + r * Math.cos(a1), m.y + r * Math.sin(a1)];
  const sweep = flow > 0 ? 1 : 0;
  const [from, to] = flow > 0 ? [s, e] : [e, s];
  // tangent at the arrow end, so the head sits along the arc
  const ang = Math.atan2(to[1] - m.y, to[0] - m.x) + (flow > 0 ? -Math.PI / 2 : Math.PI / 2);
  const tail: Pt = [to[0] - 6 * Math.cos(ang), to[1] - 6 * Math.sin(ang)];
  const side = m.side ?? -1;
  return `<g class="fx-flow"${symAttr(m.sym)}>`
    + `<path class="fx-arc${tone(m.tone)}" d="M ${n(from[0])} ${n(from[1])} A ${n(r)} ${n(r)} 0 1 ${sweep} ${n(to[0])} ${n(to[1])}"/>`
    + arrowHead(tail, to, `fx-head${tone(m.tone)}`)
    + (m.label ? labelSvg(m.x, m.y + side * (r + 14) + (side > 0 ? 6 : 0), m.label, { sym: m.sym, value: m.value, tone: m.tone }) : '')
    + `</g>`;
}

/** Across-variable label: + and − on two nodes with the name between them. */
function voltLabel(m: Marker): string {
  const len = m.len ?? 50;
  const horiz = (m.dir ?? 'h') === 'h';
  const flow = m.flow ?? 1;
  const side = m.side ?? 1;
  // The signs sit beside the terminals rather than on them: (x, y) names the
  // two nodes being measured across, and those nodes are usually wire ends.
  const at = (t: number): Pt => (horiz
    ? [m.x + t, m.y + side * 14]
    : [m.x + side * 12, m.y + t]);
  const inset = Math.max(len / 2 - 14, 6);
  const plus = at(-flow * inset), minus = at(flow * inset);
  const pos = horiz ? { x: m.x, y: m.y + side * 14 + 5 } : { x: m.x + side * 26, y: m.y + 4 };
  return `<g class="fx-flow"${symAttr(m.sym)}>`
    + `<text class="fx-pol" x="${n(plus[0])}" y="${n(plus[1] + 5)}" text-anchor="middle">+</text>`
    + `<text class="fx-pol" x="${n(minus[0])}" y="${n(minus[1] + 5)}" text-anchor="middle">−</text>`
    + (m.label ? labelSvg(pos.x, pos.y, m.label, { sym: m.sym, value: m.value, anchor: horiz ? 'middle' : side > 0 ? 'start' : 'end', tone: m.tone }) : '')
    + `</g>`;
}

function markerSvg(m: Marker): string {
  switch (m.kind) {
    case 'node': return `<circle class="fx-node" cx="${n(m.x)}" cy="${n(m.y)}" r="3.4"/>`;
    case 'ground': return ground(m);
    case 'hatch': return hatch(m);
    case 'torque': return torque(m);
    case 'volt': return voltLabel(m);
    case 'force': return flowArrow(m, 'fx-force');
    // A coupling term crosses energy domains, so it is drawn as a dashed
    // arrow: no wire or shaft carries it, the constitutive law does.
    case 'couple': return flowArrow(m, 'fx-couple');
    default: return flowArrow(m, 'fx-current');
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function schematicSvg(sch: Schematic, opts: { className?: string; ariaLabel?: string } = {}): string {
  const parts: string[] = [];

  for (const b of sch.boxes ?? []) {
    parts.push(`<g class="fx-enclosure${tone(b.tone)}"${symAttr(b.sym)}>`
      + `<rect class="fx-enclosure-box" x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" rx="6"/>`
      + (b.label ? `<text class="fx-enclosure-label" x="${n(b.x + 8)}" y="${n(b.y + b.h - 7)}">${markup(b.label)}</text>` : '')
      + `</g>`);
  }
  for (const w of sch.wires ?? []) {
    parts.push(`<polyline class="fx-wire${tone(w.tone)}${w.dashed ? ' fx-dashed' : ''}" `
      + `points="${w.pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' ')}"/>`);
  }
  for (const p of sch.parts ?? []) parts.push(partSvg(p));
  for (const m of sch.markers ?? []) parts.push(markerSvg(m));
  for (const l of sch.labels ?? []) {
    parts.push(labelSvg(l.x, l.y, l.text, { sym: l.sym, anchor: l.anchor, tone: l.tone, small: l.small }));
  }

  const aria = esc(opts.ariaLabel ?? `Schematic: ${sch.title}`);
  return `<svg class="fx-svg ${opts.className ?? ''}" viewBox="${sch.viewBox.join(' ')}" role="img" `
    + `aria-label="${aria}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`
    + parts.join('') + `</svg>`;
}
