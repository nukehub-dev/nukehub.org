# Surveys — YAML-Driven Feedback Forms

## Purpose

Reusable, content-managed survey forms rendered from `src/content/surveys/*.yml`.
Each survey becomes a standalone page at `/survey/<slug>` and submits responses
back to the NukeHub API server at `/survey`. Responses are persisted to SQLite
and an admin dashboard is available at `/admin/surveys`.

## Ownership

All files under `src/modules/survey/**` and the routes
`src/pages/survey/[slug].astro`, `src/pages/survey/index.astro`,
`src/pages/admin/surveys/index.astro`, and
`src/pages/admin/surveys/[slug].astro`.

## Local Contracts

- Surveys are defined as Astro content collection entries in
  `src/content/surveys/*.yml`. See `src/content/AGENTS.md` for the schema.
- `src/modules/survey/types.ts` mirrors the Zod schema for TypeScript consumers.
- `SurveyForm.tsx` is a React island that renders the form, validates inputs,
  handles Turnstile, and POSTs JSON to `{PUBLIC_API_URL}/survey`.
- Surveys support paging via a `pages` array. Each page has its own `title`,
  optional `description`, optional `image`, and `questions`. Single-page surveys
  can still use a flat `questions` list for backward compatibility.
- `src/pages/survey/index.astro` lists every survey as a card grid and is linked
  from the header Community dropdown and the Community footer column.
- `src/modules/survey/admin/` holds the admin dashboard islands and API client
  used by `src/pages/admin/surveys/`. Admin pages require authentication via
  `NukeAuthProvider` and are authorized server-side by email allow-list.
- `SurveyFloatingDots` provides the animated background decoration shared by the
  list and detail pages.

## Work Guidance

### Adding a survey

1. Create `src/content/surveys/<name>.yml`.
2. Provide `title` and either `pages` (multi-page) or `questions` (single-page).
   Use `slug` to override the URL.
3. The build will generate `/survey/<slug>` automatically.
4. The new survey appears on `/survey` and in the command palette without extra
   code changes.

### Question types

- `text`, `textarea`, `email`, `url`, `number` — free-form inputs.
  Add `maxLength` to cap the number of characters (enforced client-side and
  server-side). A `CharacterCount` indicator is shown for `text`, `textarea`,
  `email`, and `url` fields that set `maxLength`.
- `select`, `radio`, `checkbox` — require `options`. Each option can be a plain
  string or `{ label, value }`. For `checkbox`, add `maxSelections` to limit
  how many options can be chosen.
- `rating` — numeric buttons from `min` to `max` (defaults to 1–5). Optional
  `minLabel` and `maxLabel` strings render under the scale (e.g., “Very
  dissatisfied” / “Very satisfied”).

### Paging

- Define `pages` as a list of page objects. The form renders one page at a time
  with Previous/Next navigation, a progress bar, page step dots, and per-page
  validation. Questions are numbered sequentially across pages.
- `intro` displays before the first page; `outro` displays after the last page
  before submission. The detail page also shows a meta card with question count,
  page count, and estimated completion time.

### Submission flow

- The form POSTs `{ surveySlug, surveyTitle, responses, turnstileToken }` to
  `{PUBLIC_API_URL}/survey`.
- Draft answers and the current page are saved to `localStorage` while the user
  fills the form, and cleared after a successful submission.
- The Go server verifies Turnstile, enforces a per-value length limit, persists
  the submission and responses to SQLite, and emails the responses to
  `SURVEY_TO_EMAIL` (falling back to `CONTACT_TO_EMAIL`). If the responses
  include a valid `email` field, it is used as the email's `Reply-To` address.

### Admin dashboard

- Available at `/admin/surveys` and `/admin/surveys/<slug>`.
- Uses `NukeAuthProvider` to obtain a NukeAuth access token and sends it as a
  bearer token to `{PUBLIC_API_URL}/admin/surveys/*` endpoints.
- Lists every survey with response counts, shows paginated submissions,
  displays per-question distributions, and offers CSV export.
- The detail page maps raw question IDs back to the human-readable labels
  defined in the survey YAML.
- The submissions table is built with `@tanstack/react-table` and supports
  searching, sorting, toggling column visibility, and choosing the page size.
  It also has a compact mobile card view inspired by the NukeLab admin data
  table; each card and table row opens a modal with the full response rendered
  as question/answer pairs (rating values shown as stars, checkbox answers as
  badges).
- The stats panel renders an interactive daily-response bar chart with
  `recharts` and shows per-question distributions as labeled cards.
- Free-text questions (`text`, `textarea`, `email`, `url`) are excluded from
  distributions because their values are mostly unique.
- Distribution cards show the top 10 values by default with a toggle to reveal
  the rest, and the API caps each distribution to the top 50 values.
- Generate realistic demo submissions for local testing with
  `npm run seed:surveys` (see `scripts/AGENTS.md`).

## Verification

```bash
npm run build
npx astro check
```

## Child NAD Index

- None.
