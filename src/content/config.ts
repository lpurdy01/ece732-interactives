import { defineCollection, z } from 'astro:content';

// Mirrors the note frontmatter defined in docs/KNOWLEDGE_SYSTEM.md.
// `visibility` drives the public/private split build; `status` drives the
// "not yet verified" treatment that keeps a large note graph from being
// mistaken for understanding.
const concepts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    id: z.string(),
    tags: z.array(z.string()).default([]),
    visibility: z.enum(['public', 'private']).default('private'),
    status: z.enum(['agent-drafted', 'student-verified']).default('agent-drafted'),
    sources: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
  }),
});

export const collections = { concepts };
