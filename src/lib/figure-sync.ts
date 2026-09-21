/**
 * Tie the figures to the controls.
 *
 * Every part of a schematic, every block of a block diagram and every slider
 * label carries `data-sym`. This module makes that tag do three jobs:
 *
 *   highlight  touch a slider and the same quantity lights up in both
 *              pictures, which is the answer to "which one is R_p".
 *   values     `data-val` slots are filled at runtime, never at build time,
 *              so a figure never shows a number the page has not computed.
 *   presence   a part that the selected case does not use is greyed rather
 *              than removed, so the picture does not reflow under you.
 *
 * `data-sym` holds a space-separated list, because one block can stand for
 * several sliders: 1/(L_p s + R_p + R_a) is all three.
 */

const keysOf = (el: Element): string[] => (el.getAttribute('data-sym') ?? '').trim().split(/\s+/).filter(Boolean);

/** Fill the `data-val` slots. Pass a pre-formatted string: units included. */
export function setFigureValues(root: ParentNode, values: Record<string, string>): void {
  for (const [k, v] of Object.entries(values)) {
    root.querySelectorAll(`[data-val="${k}"]`).forEach((el) => { el.textContent = v; });
  }
}

/** Grey out the parts a case does not use; `true` means in use. */
export function setFigureActive(root: ParentNode, state: Record<string, boolean>): void {
  for (const [k, on] of Object.entries(state)) {
    root.querySelectorAll(`[data-sym~="${k}"]`).forEach((el) => { el.classList.toggle('is-off', !on); });
  }
}

/**
 * Hover or focus anything tagged with a symbol and every sibling tagged with
 * the same symbol lights up. Works in both directions: from a slider into the
 * figures, and from a figure back to the slider that moves it.
 */
export function bindFigureHighlight(root: HTMLElement): void {
  const tagged = Array.from(root.querySelectorAll<HTMLElement>('[data-sym]'));
  if (!tagged.length) return;

  const mark = (key: string | null) => {
    for (const el of tagged) el.classList.toggle('is-hot', key !== null && keysOf(el).includes(key));
    root.classList.toggle('has-hot', key !== null);
  };

  // Dragging a slider takes the pointer off it, so releasing the highlight
  // asks what still has focus rather than assuming the pointer speaks for it.
  const release = () => {
    const active = document.activeElement as HTMLElement | null;
    const held = active && root.contains(active) ? active.closest('[data-sym]') : null;
    mark(held ? keysOf(held)[0] ?? null : null);
  };

  for (const el of tagged) {
    const key = keysOf(el)[0];
    if (!key) continue;
    el.addEventListener('pointerenter', () => mark(key));
    el.addEventListener('pointerleave', release);
    el.addEventListener('focusin', () => mark(key));
    el.addEventListener('focusout', release);
    el.addEventListener('input', () => mark(key));
  }
}
