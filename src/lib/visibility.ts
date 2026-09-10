import type { CollectionEntry } from 'astro:content';

/**
 * The publish gate.
 *
 * Course material is the instructor's IP and the syllabus restricts it to
 * personal use, so the public build carries only notes explicitly marked
 * public. The default is private and this function never infers otherwise:
 * a note with missing or malformed frontmatter is treated as private.
 */
export function isPublishable(entry: CollectionEntry<'concepts'>): boolean {
  return entry.data.visibility === 'public';
}

export function visibleConcepts(
  entries: CollectionEntry<'concepts'>[],
): CollectionEntry<'concepts'>[] {
  const publicOnly = import.meta.env.PUBLIC_ONLY === true;
  return publicOnly ? entries.filter(isPublishable) : entries;
}
