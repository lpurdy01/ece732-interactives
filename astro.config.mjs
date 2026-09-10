import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// PUBLIC_ONLY=1 builds the publishable split: interactive tools and notes
// written from general knowledge, with everything derived from the
// instructor's materials excluded.  See docs/PUBLIC_MIRROR.md.
// A GitHub Pages project site is served from /<repo>/, so the build needs a
// base path. Local dev and the private build stay at the root.
const base = process.env.PUBLIC_BASE || '/';

export default defineConfig({
  site: process.env.PUBLIC_SITE || 'https://ece732.example.invalid',
  base,
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    define: {
      'import.meta.env.PUBLIC_ONLY': JSON.stringify(process.env.PUBLIC_ONLY === '1'),
    },
  },
});
