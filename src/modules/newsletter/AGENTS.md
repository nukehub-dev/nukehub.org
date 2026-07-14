# Newsletter Module

## Purpose

Newsletter subscription: a shared signup island used by the footer, the
public unsubscribe confirm page, and the admin dashboard for subscribers
and campaigns.

## Ownership

This NAD owns `src/modules/newsletter/**` and the routes
`src/pages/admin/newsletter/index.astro` and
`src/pages/newsletter/unsubscribe/index.astro`. Parent: `src/modules/AGENTS.md`.

- `admin/` — three tabs. Subscribers: debounced email search, source filter,
  multi-select with bulk delete, single delete, CSV export, table/cards view
  toggle, and survey-style pagination (numbered pages, page-size select).
  Campaigns: compose, preview, test send, send, delete, plus title/subject
  search and status filter chips. Statistics: `StatsPanel.tsx` renders
  `GET /admin/newsletter/stats` (signup trend chart, per-source bars, campaign
  delivery summary) and is only mounted while the tab is active.
- `components/UnsubscribeConfirm.tsx` — confirm page island; posts the
  HMAC token from the URL to `{PUBLIC_API_URL}/newsletter/unsubscribe/confirm`.
  Both the island and its route are styled like the 404 page (ambient glow,
  staggered text reveal, floating particles, `showFooter={false}`) with
  reactor-themed copy for the confirm/done/invalid-token states.
- The public signup island lives at `src/components/shared/NewsletterSignup.tsx`
  (owned by `src/AGENTS.md`); it posts to `{PUBLIC_API_URL}/newsletter` with
  Turnstile, `source` tracking, and an unsubscribe toggle.
- The Go handlers live in `api-server/main.go` (subscriptions) and
  `api-server/newsletter_campaign.go` (campaigns, tokens, sender worker).
  See `api-server/AGENTS.md`.

## Local Contracts

- Admin route: `/admin/newsletter/`, protected by NukeAuth client roles
  `newsletter-admin` (full, including campaign send/delete) and
  `newsletter-staff` (manage subscribers, create/edit/test campaigns).
  Roles are interpreted in the components and enforced server-side.
- Campaign bodies are Markdown. The compose UI previews via
  `POST /admin/newsletter/campaigns/preview` (server-side goldmark render),
  so preview output always matches the sent email. From addresses come from
  `GET /admin/newsletter/config` — never hardcode them in the UI.
- The dashboard polls campaign lists every 5s while any campaign is
  `sending`.
- Campaigns created by the api-server's blog RSS watcher
  (`source = "blog-rss"`) appear with an "Auto" badge and are sent from
  `BLOG_FROM_EMAIL` without admin action.
- Email unsubscribe links point at `/newsletter/unsubscribe/?token=...`
  (this site's confirm page). Mail clients also get an RFC 8058 one-click
  URL via the `List-Unsubscribe` header; neither requires a captcha — the
  token is the proof.

## Work Guidance

- Mirror the survey module's patterns (`useAsyncState`, `fetchJson`,
  `ConfirmDialog`, shared `ui/` primitives). See `src/modules/survey/AGENTS.md`.
- Do not add role-gating UI changes here; roles are interpreted in the
  components and enforced server-side by the api-server.

## Verification

Run from the repo root: `npm run lint`, `npm run format:check`,
`npm run build`, `npx astro check`.

## Child NAD Index

None.
