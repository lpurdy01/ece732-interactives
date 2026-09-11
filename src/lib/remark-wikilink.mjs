/**
 * Turn [[note-id]] into a real link, and mark links to notes that do not exist.
 *
 * The knowledge system is meant to be a graph, and KNOWLEDGE_SYSTEM.md is
 * explicit that "a link to a note that does not exist yet is not an error -- it
 * marks something worth writing, and the site renders it as a visible gap".
 * Without this, [[laplace-transform]] renders as literal brackets.
 *
 * Note on the regex: it is built fresh per call rather than shared at module
 * scope. A module-level /g regex is stateful -- .test() advances lastIndex, so
 * the next node starts matching from the middle of its string and silently
 * fails. That bug made this plugin convert roughly every other link.
 */

import fs from 'node:fs';

const PATTERN = String.raw`\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]`;

function knownIds(dir) {
  try {
    return new Set(
      fs.readdirSync(dir)
        .filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'))
        .map((f) => f.replace(/\.mdx?$/, '')),
    );
  } catch {
    return new Set();
  }
}

export function remarkWikilink({ notesDir, base = '/' } = {}) {
  const ids = knownIds(notesDir);
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;

  return (tree) => {
    const visit = (parent) => {
      if (!parent.children) return;
      const rebuilt = [];
      for (const node of parent.children) {
        if (node.type !== 'text' || !node.value.includes('[[')) {
          visit(node);
          rebuilt.push(node);
          continue;
        }
        const re = new RegExp(PATTERN, 'g');   // fresh: never shared state
        let last = 0;
        let match;
        while ((match = re.exec(node.value)) !== null) {
          if (match.index > last) {
            rebuilt.push({ type: 'text', value: node.value.slice(last, match.index) });
          }
          const id = match[1].trim();
          const label = (match[2] || id).trim();
          const exists = ids.has(id);
          rebuilt.push({
            type: 'link',
            url: `${prefix}/concepts/${id}/`,
            data: {
              hProperties: {
                className: exists ? ['wikilink'] : ['wikilink', 'wikilink-missing'],
                title: exists ? id : `${id} — not written yet`,
              },
            },
            children: [{ type: 'text', value: label }],
          });
          last = match.index + match[0].length;
        }
        if (last < node.value.length) {
          rebuilt.push({ type: 'text', value: node.value.slice(last) });
        }
      }
      parent.children = rebuilt;
    };
    visit(tree);
  };
}
