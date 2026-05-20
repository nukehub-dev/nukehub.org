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

export const collections = { manual, projects, community, events };
