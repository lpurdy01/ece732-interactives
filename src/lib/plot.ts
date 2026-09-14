/**
 * Minimal canvas plotting helpers shared by the interactives.
 *
 * Handles the two things every one of them needs and that are easy to get
 * subtly wrong: device-pixel-ratio scaling (so lines are crisp, not blurry)
 * and a world->screen transform with an equal-aspect option (so a circle
 * looks like a circle and an eigenvector's direction is not visually skewed).
 */

export interface View {
  ctx: CanvasRenderingContext2D;
  width: number;   // CSS pixels
  height: number;
  x: (worldX: number) => number;
  y: (worldY: number) => number;
  /** Inverse transform, for hit-testing pointer drags. */
  invX: (screenX: number) => number;
  invY: (screenY: number) => number;
  scaleX: number;
  scaleY: number;
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return ctx;
}

export interface ViewOptions {
  xMin: number; xMax: number; yMin: number; yMax: number;
  pad?: number;
  equalAspect?: boolean;
}

export function makeView(canvas: HTMLCanvasElement, opts: ViewOptions): View {
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  const pad = opts.pad ?? 34;
  const w = rect.width - 2 * pad;
  const h = rect.height - 2 * pad;

  let sx = w / (opts.xMax - opts.xMin);
  let sy = h / (opts.yMax - opts.yMin);
  if (opts.equalAspect) sx = sy = Math.min(sx, sy);

  const cx = pad + w / 2;
  const cy = pad + h / 2;
  const midX = (opts.xMin + opts.xMax) / 2;
  const midY = (opts.yMin + opts.yMax) / 2;

  return {
    ctx, width: rect.width, height: rect.height, scaleX: sx, scaleY: sy,
    x: (wx) => cx + (wx - midX) * sx,
    y: (wy) => cy - (wy - midY) * sy,
    invX: (px) => midX + (px - cx) / sx,
    invY: (py) => midY - (py - cy) / sy,
  };
}

/** Theme-aware colours pulled from CSS custom properties on :root. */
export function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    (style.getPropertyValue(name) || '').trim() || fallback;
  return {
    ink: read('--ink', '#1a1a1a'),
    muted: read('--muted', '#666'),
    grid: read('--rule', '#ddd'),
    accent: read('--accent', '#7a1f1f'),
    series: ['#2f6f9f', '#c2603d', '#4c8a5a', '#8a5fa8', '#b08a2e'],
  };
}

export function drawAxes(view: View, opts: {
  xLabel?: string; yLabel?: string;
  xTicks?: number[]; yTicks?: number[];
} = {}) {
  const { ctx } = view;
  const c = themeColors();
  ctx.save();
  ctx.strokeStyle = c.grid;
  ctx.fillStyle = c.muted;
  ctx.lineWidth = 1;
  ctx.font = '11px ui-monospace, monospace';

  for (const tx of opts.xTicks ?? []) {
    const px = view.x(tx);
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, view.height - 8); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillText(String(tx), px, view.height - 10);
  }
  for (const ty of opts.yTicks ?? []) {
    const py = view.y(ty);
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(8, py); ctx.lineTo(view.width - 8, py); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.fillText(String(ty), 10, py - 3);
  }

  // Origin lines drawn darker than the grid.
  ctx.strokeStyle = c.muted;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(8, view.y(0)); ctx.lineTo(view.width - 8, view.y(0));
  ctx.moveTo(view.x(0), 8); ctx.lineTo(view.x(0), view.height - 8);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (opts.xLabel) {
    ctx.textAlign = 'right';
    ctx.fillText(opts.xLabel, view.width - 10, view.y(0) - 6);
  }
  if (opts.yLabel) {
    ctx.textAlign = 'left';
    ctx.fillText(opts.yLabel, view.x(0) + 6, 16);
  }
  ctx.restore();
}

export function drawArrow(view: View, from: [number, number], to: [number, number],
                          color: string, width = 2, head = 9) {
  const { ctx } = view;
  const x1 = view.x(from[0]), y1 = view.y(from[1]);
  const x2 = view.x(to[0]), y2 = view.y(to[1]);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  if (!isFinite(angle)) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.4), y2 - head * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.4), y2 - head * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawPolyline(view: View, points: Array<[number, number]>,
                             color: string, width = 2, dash: number[] = []) {
  if (points.length < 2) return;
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  points.forEach(([px, py], i) => {
    const sx = view.x(px), sy = view.y(py);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
  ctx.restore();
}

export function label(view: View, text: string, at: [number, number],
                      color: string, align: CanvasTextAlign = 'left') {
  const { ctx } = view;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '12px ui-monospace, monospace';
  ctx.textAlign = align;
  ctx.fillText(text, view.x(at[0]), view.y(at[1]));
  ctx.restore();
}
