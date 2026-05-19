import { defineCollection, z } from 'astro:content';

const manual = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    permalink: z.string(),
    lastUpdated: z.coerce.date().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().url(),
    source: z.string().url(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
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
