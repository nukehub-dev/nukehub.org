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
    url: z.string().url().optional(),
    source: z.string().url().optional(),
    newpage: z.boolean().optional(),
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

const recurrenceSchema = z.discriminatedUnion('type', [
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
]);

const events = defineCollection({
  type: 'data',
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
    recurrence: recurrenceSchema.optional(),
  }),
});

const people = defineCollection({
  type: 'data',
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
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
  }),
});

const sponsors = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    image: z.string(),
    url: z.string().url(),
    acknowledgment: z.string(),
    tier: z.enum(['platinum', 'gold', 'silver', 'bronze']).default('bronze'),
  }),
});

export const collections = { manual, projects, community, events, people, peopleCategories, sponsors };
