# Surveys — YAML-Driven Feedback Forms

## Purpose

Reusable, content-managed survey forms rendered from `src/content/surveys/*.yml`.
Each survey becomes a standalone page at `/survey/<slug>` and submits responses
back to the Go contact server at `/survey`.

## Ownership

All files under `src/modules/survey/**` and the routes
`src/pages/survey/[slug].astro` and `src/pages/survey/index.astro`.

## Local Contracts

- Surveys are defined as Astro content collection entries in
  `src/content/surveys/*.yml`. See `src/content/AGENTS.md` for the schema.
- `src/modules/survey/types.ts` mirrors the Zod schema for TypeScript consumers.
- `SurveyForm.tsx` is a React island that renders the form, validates inputs,
  handles Turnstile, and POSTs JSON to `PUBLIC_SURVEY_API_URL`.
- Surveys support paging via a `pages` array. Each page has its own `title`,
  optional `description`, optional `image`, and `questions`. Single-page surveys
  can still use a flat `questions` list for backward compatibility.
- `src/pages/survey/index.astro` lists every survey as a card grid and is linked
  from the header Community dropdown and the Community footer column.

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
- `rating` — numeric buttons from `min` to `max` (defaults to 1–5).

### Paging

- Define `pages` as a list of page objects. The form renders one page at a time
  with Previous/Next navigation, a progress bar, and per-page validation.
- `intro` displays before the first page; `outro` displays after the last page
  before submission.

### Submission flow

- The form POSTs `{ surveySlug, surveyTitle, responses, turnstileToken }` to
  `PUBLIC_SURVEY_API_URL`.
- Draft answers and the current page are saved to `localStorage` while the user
  fills the form, and cleared after a successful submission.
- The Go server verifies Turnstile, enforces a per-value length limit, and
  emails the responses to `SURVEY_TO_EMAIL` (falling back to `CONTACT_TO_EMAIL`).
  If the responses include a valid `email` field, it is used as the email's
  `Reply-To` address.

## Verification

```bash
npm run build
npx astro check
```

## Child NAD Index

- None.
