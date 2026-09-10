/**
 * Build a URL that survives being served from a sub-path.
 *
 * A GitHub Pages *project* site lives at /<repo>/, not at the domain root, so
 * a hardcoded href="/interactives/" 404s once published while working fine in
 * local dev. Astro exposes the configured base as import.meta.env.BASE_URL;
 * everything internal goes through here so the two cases cannot diverge.
 */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const left = base.endsWith('/') ? base.slice(0, -1) : base;
  const right = path.startsWith('/') ? path : `/${path}`;
  return `${left}${right}`;
}
