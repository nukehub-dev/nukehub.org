# Newsletter Module

## Purpose

Newsletter subscription: a shared signup island used by the footer, and an
admin dashboard listing subscribers.

## Ownership

This NAD owns `src/modules/newsletter/**` and the route
`src/pages/admin/newsletter/index.astro`. Parent: `src/modules/AGENTS.md`.

- `admin/` — subscriber dashboard (list, CSV export, delete).
- The public signup island lives at `src/components/shared/NewsletterSignup.tsx`
  (owned by `src/AGENTS.md`); it posts to `{PUBLIC_API_URL}/newsletter` with
  Turnstile, `source` tracking, and an unsubscribe toggle.
- The Go handlers live in `api-server/internal/newsletter/`. See
  `api-server/AGENTS.md`.

## Local Contracts

- Admin route: `/admin/newsletter/`, protected by NukeAuth. Uses the same
  `survey-admin` / `survey-viewer` realm roles as the survey admin (viewers
  cannot delete). See `src/modules/survey/AGENTS.md`.
- Dashboard fetches `{PUBLIC_API_URL}/admin/newsletter/subscribers` with
  `Authorization: Bearer <token>`, paginates 50 per page, and downloads the
  CSV export as an authenticated blob (a plain link would not carry the
  Authorization header).
- The API stores subscriptions only — sending newsletter emails is not
  implemented anywhere.

## Work Guidance

- Mirror the survey module's patterns (`useAsyncState`, `fetchApiData`,
  `ConfirmDialog`, `PageShell`). See `src/modules/survey/AGENTS.md`.
- Do not add role-gating UI changes here; roles are interpreted in the
  components and enforced server-side by the api-server.

## Verification

Run from the repo root: `npm run lint`, `npm run format:check`,
`npm run build`, `npx astro check`.

## Child NAD Index

None.
