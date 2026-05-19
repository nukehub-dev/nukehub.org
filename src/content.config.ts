import { defineCollection, z } from 'astro:content';

const manual = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
  }),
});

const community = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    permalink: z.string(),
  }),
});

export const collections = { manual, projects, community };
