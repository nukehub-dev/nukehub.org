import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const manual = defineCollection({
  loader: glob({ pattern: '**/[^_]*.mdx', base: './src/content/manual' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
    url: z.string().url().optional(),
    source: z.string().url().optional(),
    newpage: z.boolean().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{yml,yaml}', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    start: z.string().datetime(),
    end: z.string().datetime().optional(),
    venue: z.string().optional(),
    organizer: z
      .array(z.object({ name: z.string(), email: z.string().email() }))
      .optional(),
    speakers: z
      .array(z.object({ name: z.string(), email: z.string().email() }))
      .optional(),
    url: z.string().url().optional(),
    meetingUrl: z.string().url().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    recurrence: z.discriminatedUnion('type', [
      z.object({ type: z.literal('monthly-date'), day: z.number().min(1).max(31) }),
      z.object({
        type: z.literal('monthly-weekday'),
        weekday: z.number().min(0).max(6),
        occurrence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(-1)]),
      }),
      z.object({ type: z.literal('weekly'), weekday: z.number().min(0).max(6) }),
      z.object({
        type: z.literal('biweekly'),
        weekday: z.number().min(0).max(6),
        anchorDate: z.string(),
      }),
    ]).optional(),
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{yml,yaml}', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    image: z.string(),
    organization: z.string().optional(),
    role: z.string().optional(),
    location: z.string().optional(),
    email: z.string().email(),
    phone: z.string().optional(),
    url: z.string().url().optional(),
    whatsapp: z.string().optional(),
    signal: z.string().optional(),
    linkedin: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    github: z.string().optional(),
    gitlab: z.string().optional(),
    bitbucket: z.string().optional(),
    stackoverflow: z.string().optional(),
    scholar: z.string().optional(),
    orcid: z.string().optional(),
    researchgate: z.string().optional(),
    zotero: z.string().optional(),
    youtube: z.string().optional(),
    mastodon: z.string().optional(),
    bluesky: z.string().optional(),
    discord: z.string().optional(),
    telegram: z.string().optional(),
    medium: z.string().optional(),
    tiktok: z.string().optional(),
    threads: z.string().optional(),
    x: z.string().optional(),
    twitch: z.string().optional(),
    reddit: z.string().optional(),
    category: z.string(),
  }),
});

const peopleCategories = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{yml,yaml}', base: './src/content/peopleCategories' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
  }),
});

const sponsors = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{yml,yaml}', base: './src/content/sponsors' }),
  schema: z.object({
    name: z.string(),
    image: z.string(),
    url: z.string().url(),
    acknowledgment: z.string(),
    tier: z.enum(['platinum', 'gold', 'silver', 'bronze']).default('bronze'),
  }),
});

const support = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{yml,yaml}', base: './src/content/support' }),
  schema: z.object({
    hero: z.object({
      title: z.string(),
      description: z.string(),
    }),
    impacts: z.array(
      z.object({
        icon: z.string(),
        title: z.string(),
        description: z.string(),
      })
    ),
    methods: z.array(
      z.object({
        icon: z.string(),
        title: z.string(),
        description: z.string(),
        cta: z.string(),
        href: z.string(),
      })
    ),
    tiers: z.array(
      z.object({
        name: z.string(),
        price: z.string(),
        period: z.string(),
        tier: z.enum(['platinum', 'gold', 'silver', 'bronze']),
        description: z.string(),
        features: z.array(z.string()),
        cta: z.string(),
        href: z.string(),
        featured: z.boolean().optional(),
      })
    ),
    contact: z.object({
      title: z.string(),
      description: z.string(),
      primaryCta: z.object({ text: z.string(), href: z.string() }),
      secondaryCta: z.object({ text: z.string(), href: z.string() }),
    }),
  }),
});

export const collections = { manual, projects, events, people, peopleCategories, sponsors, support };
