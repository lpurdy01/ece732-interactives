/**
 * Draw a practice block diagram (see diagram-problems.mjs) as an SVG string.
 *
 * One function draws both the full diagram and the zoomed crop on each
 * equation card: a crop is the same drawing with a tighter viewBox, so the two
 * can never show different things.
 *
 * Colours come from CSS classes, not attributes -- custom properties do not
 * resolve inside SVG presentation attributes, and the site has a dark theme.
 */

import { REGION_COLORS } from './diagram-problems.mjs';

type Pt = [number, number];

export interface SvgOptions {
  viewBox?: [number, number, number, number];
  regions?: boolean;
  /** Draw only this region's box (used by the zoomed crops). */
  onlyRegion?: number;
  className?: string;
  ariaLabel?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * "q_{in}" / "x^{2}" / "\dot{ω}" markup -> tspans. Plain characters pass through.
 *
 * A combining dot (U+0307) drifts off to the side of ω and T in most serif
 * fonts, so a dot is drawn as its own glyph pulled back over the letter.
 */
export function markup(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (text.startsWith('\\dot{', i)) {
      const close = text.indexOf('}', i + 5);
      const body = text.slice(i + 5, close);
      // U+02D9 sits at x-height: fine over ω, but hidden in the crossbar of a
      // capital, so capitals lift it further.
      const lift = /[A-Z]/.test(body) ? 0.3 : 0.02;
      out += `${esc(body)}<tspan dx="-0.3em" dy="${-lift}em">\u02d9</tspan><tspan dx="-0.02em" dy="${lift}em">\u200b</tspan>`;
      i = close + 1;
    } else if ((c === '_' || c === '^') && text[i + 1] === '{') {
      const close = text.indexOf('}', i + 2);
      const body = text.slice(i + 2, close < 0 ? text.length : close);
      const dy = c === '_' ? 0.32 : -0.42;
      out += `<tspan font-size="72%" dy="${dy}em">${esc(body)}</tspan><tspan dy="${-dy}em">​</tspan>`;
      i = close < 0 ? text.length : close + 1;
    } else {
      out += esc(c);
      i++;
    }
  }
  return out;
}

export function regionColor(n: number): string {
  return REGION_COLORS[(n - 1) % REGION_COLORS.length];
}

function arrowHead([ax, ay]: Pt, [bx, by]: Pt): string {
  const ang = Math.atan2(by - ay, bx - ax);
  const len = 9, half = 0.38;
  const p1: Pt = [bx - len * Math.cos(ang - half), by - len * Math.sin(ang - half)];
  const p2: Pt = [bx - len * Math.cos(ang + half), by - len * Math.sin(ang + half)];
  return `<polygon class="dd-head" points="${bx},${by} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}"/>`;
}

/** Place a junction sign just before the arrowhead, off to one side. */
function signGlyph(pts: Pt[], sign: string): string {
  const [ax, ay] = pts[pts.length - 2];
  const [bx, by] = pts[pts.length - 1];
  const d = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / d, uy = (by - ay) / d;
  // Horizontal arrivals put the sign below the wire, vertical arrivals to its
  // right -- the common textbook placement, and clear of the arrowhead.
  const horizontal = Math.abs(ux) >= Math.abs(uy);
  const x = bx - 17 * ux + (horizontal ? 0 : 10);
  const y = by - 17 * uy + (horizontal ? 12 : 0) + 4;
  return `<text class="dd-sign" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${sign === '-' ? '−' : '+'}</text>`;
}

export function diagramSvg(problem: any, opts: SvgOptions = {}): string {
  const vb = opts.viewBox ?? problem.viewBox;
  const parts: string[] = [];

  if (opts.regions !== false) {
    for (const r of problem.regions) {
      if (opts.onlyRegion !== undefined && r.n !== opts.onlyRegion) continue;
      const [x, y, w, h] = r.box;
      const color = regionColor(r.n);
      parts.push(`<g class="dd-region" data-n="${r.n}" style="--rc:${color}">`
        + `<rect class="dd-region-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>`
        + `<circle class="dd-badge" cx="${x}" cy="${y}" r="10"/>`
        + `<text class="dd-badge-n" x="${x}" y="${y + 4}" text-anchor="middle">${r.n}</text>`
        + `</g>`);
    }
  }

  for (const w of problem.wires) {
    const pts = w.pts as Pt[];
    const tone = w.tone ? ` dd-tone-${w.tone}` : '';
    parts.push(`<polyline class="dd-wire${tone}" points="${pts.map((p) => p.join(',')).join(' ')}"/>`);
    parts.push(arrowHead(pts[pts.length - 2], pts[pts.length - 1]).replace('class="dd-head"', `class="dd-head${tone}"`));
    if (w.tap) parts.push(`<circle class="dd-tap" cx="${pts[0][0]}" cy="${pts[0][1]}" r="3"/>`);
    if (w.sign) parts.push(signGlyph(pts, w.sign));
  }

  for (const el of problem.elements) {
    if (el.kind === 'sum') {
      parts.push(`<circle class="dd-sum${el.tone ? ` dd-tone-${el.tone}` : ''}" cx="${el.x}" cy="${el.y}" r="${el.r ?? 13}"/>`);
      continue;
    }
    const w = el.w ?? 46, h = el.h ?? 40;
    parts.push(`<rect class="dd-block${el.kind === 'fn' ? ' dd-fn' : ''}${el.tone ? ` dd-tone-${el.tone}` : ''}" x="${el.x - w / 2}" y="${el.y - h / 2}" width="${w}" height="${h}"/>`);
    const label = el.label;
    const ink = el.tone ? ` dd-tone-${el.tone}` : '';
    if (label && typeof label === 'object' && label.frac) {
      const [num, den] = label.frac;
      parts.push(`<text class="dd-blabel" x="${el.x}" y="${el.y - 5}" text-anchor="middle">${markup(num)}</text>`);
      parts.push(`<line class="dd-fracbar" x1="${el.x - 12}" y1="${el.y}" x2="${el.x + 12}" y2="${el.y}"/>`);
      parts.push(`<text class="dd-blabel" x="${el.x}" y="${el.y + 15}" text-anchor="middle">${markup(den)}</text>`);
    } else if (label) {
      parts.push(`<text class="dd-blabel${ink}" x="${el.x}" y="${el.y + 5}" text-anchor="middle">${markup(String(label))}</text>`);
    }
  }

  for (const l of problem.labels ?? []) {
    const svg = problem.symbols?.[l.sym]?.svg ?? l.sym;
    parts.push(`<text class="dd-slabel" x="${l.x}" y="${l.y}" text-anchor="${l.anchor ?? 'middle'}">${markup(svg)}</text>`);
  }

  const aria = esc(opts.ariaLabel ?? `Block diagram: ${problem.title}`);
  return `<svg class="dd-svg ${opts.className ?? ''}" viewBox="${vb.join(' ')}" role="img" aria-label="${aria}" `
    + `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

/** viewBox for a zoomed crop around one region, padded so wires read as context. */
export function cropBox(problem: any, region: any, pad = 30): [number, number, number, number] {
  const [x, y, w, h] = region.box;
  const [vx, vy, vw, vh] = problem.viewBox;
  // A minimum window keeps a one-junction region from being blown up to a
  // much larger scale than a wide region on the next card.
  const cw = Math.max(w + 2 * pad, 230), ch = Math.max(h + 2 * pad, 130);
  const cx = x + w / 2, cy = y + h / 2;
  const x0 = Math.max(vx, cx - cw / 2), y0 = Math.max(vy, cy - ch / 2);
  const x1 = Math.min(vx + vw, cx + cw / 2), y1 = Math.min(vy + vh, cy + ch / 2);
  return [x0, y0, x1 - x0, y1 - y0];
}
