import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const manual = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/manual" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    permalink: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
    url: z.string().url().optional(),
    source: z.string().url().optional(),
    githubRepo: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/)
      .optional(),
    showStats: z.boolean().default(true).optional(),
    newpage: z.boolean().optional(),
    image: z.string().optional(),
    imageDark: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customPage: z.boolean().optional(),
    order: z.number().optional(),
    icon: z.string().optional(),
  }),
});

const events = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{yml,yaml}",
    base: "./src/content/events",
  }),
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
    recurrence: z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("monthly-date"),
          day: z.number().min(1).max(31),
        }),
        z.object({
          type: z.literal("monthly-weekday"),
          weekday: z.number().min(0).max(6),
          occurrence: z.union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(-1),
          ]),
        }),
        z.object({
          type: z.literal("weekly"),
          weekday: z.number().min(0).max(6),
        }),
        z.object({
          type: z.literal("biweekly"),
          weekday: z.number().min(0).max(6),
          anchorDate: z.string(),
        }),
      ])
      .optional(),
  }),
});

const people = defineCollection({
  loader: glob({ pattern: "[^_]*.{yml,yaml}", base: "./src/content/people" }),
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
    bio: z.string().optional(),
    category: z.string(),
  }),
});

const peopleCategories = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{yml,yaml}",
    base: "./src/content/people/categories",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
  }),
});

const sponsors = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{yml,yaml}",
    base: "./src/content/sponsors",
  }),
  schema: z.object({
    name: z.string(),
    image: z.string(),
    url: z.string().url(),
    acknowledgment: z.string(),
    tier: z.enum(["platinum", "gold", "silver", "bronze"]).default("bronze"),
  }),
});

const testimonials = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{yml,yaml}",
    base: "./src/content/testimonials",
  }),
  schema: z.object({
    quote: z.string(),
    author: z.string(),
    role: z.string(),
    avatar: z.string(),
  }),
});

const integrations = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{yml,yaml}",
    base: "./src/content/integrations",
  }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().url(),
    category: z.enum([
      "Simulation",
      "Geometry",
      "Data Processing",
      "Plasma Physics",
      "Fusion",
    ]),
  }),
});

const roadmap = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{mdx,md}", base: "./src/content/roadmap" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(["planned", "in-progress", "shipped", "parked"]),
    targetQuarter: z.string().optional(),
    relatedProject: z.string().optional(),
    ghIssueUrl: z.string().url().optional(),
    order: z.number().optional(),
  }),
});

const changelog = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{mdx,md}",
    base: "./src/content/changelog",
  }),
  schema: z.object({
    version: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    breaking: z.array(z.string()).default([]),
    project: z.string().optional(),
    githubReleaseUrl: z.string().url().optional(),
  }),
});

const surveyQuestionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum([
    "text",
    "textarea",
    "email",
    "number",
    "url",
    "select",
    "radio",
    "checkbox",
    "rating",
  ]),
  label: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z
    .array(
      z.union([z.string(), z.object({ label: z.string(), value: z.string() })]),
    )
    .optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  maxLength: z.number().int().min(1).optional(),
  maxSelections: z.number().int().min(1).optional(),
  image: z.string().optional(),
  video: z.string().optional(),
});

const surveyPageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  questions: z.array(surveyQuestionSchema),
});

const surveys = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{yml,yaml}",
    base: "./src/content/surveys",
  }),
  schema: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      slug: z.string().optional(),
      intro: z.string().optional(),
      outro: z.string().optional(),
      successMessage: z.string().optional(),
      submitLabel: z.string().optional(),
      pages: z.array(surveyPageSchema).optional(),
      questions: z.array(surveyQuestionSchema).optional(),
    })
    .refine(
      (data) =>
        (data.pages?.length ?? 0) > 0 || (data.questions?.length ?? 0) > 0,
      {
        message: "Survey must have at least one page or question",
      },
    ),
});

export const collections = {
  manual,
  projects,
  events,
  people,
  peopleCategories,
  sponsors,
  testimonials,
  integrations,
  roadmap,
  changelog,
  surveys,
};
