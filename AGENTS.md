# Nuke Agent Doc (NAD) Framework

## Purpose

Binding work contract for AI agents and human contributors working on the
NukeHub flagship brand site (Astro + React Islands + Tailwind v4, deployed
statically on Cloudflare Pages).

## Ownership

This root `AGENTS.md` owns the NAD hierarchy, project-wide workflow rules, and
cross-domain standards. Domain-specific guidance lives in child `AGENTS.md`
files listed in the Child NAD Index.

## NAD Core Contract

- `AGENTS.md` files are binding work contracts for their subtrees.
- Work products, source materials, instructions, records, assets, and durable
  docs must stay understandable from the nearest applicable `AGENTS.md` plus
  every parent `AGENTS.md` above it.

### Read Before Editing

1. Read this root `AGENTS.md`.
2. Identify every file or folder you expect to touch.
3. Walk from the repository root to each target path.
4. Read every `AGENTS.md` found along each route.
5. If a parent `AGENTS.md` lists a child `AGENTS.md` whose scope contains the
   path, read that child and continue from there.
6. Use the nearest `AGENTS.md` as the local contract and parent docs for
   repo-wide rules.
7. If docs conflict, the closer doc controls local work details, but no child
   doc may weaken NAD.

### Update After Editing

Every meaningful change requires a NAD pass before the task is done.

Update the closest owning `AGENTS.md` when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or
  artifacts
- user preferences about behavior, communication, process, organization, or
  quality
- `AGENTS.md` creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child
index changes. Update child docs when parent changes alter local rules. Remove
stale or contradictory text immediately. Small edits that do not change
behavior or contracts may leave docs unchanged, but the NAD pass still must
happen.

## Hierarchy

- Root `AGENTS.md` is the NAD rail: project-wide instructions, global
  preferences, durable workflow rules, and the top-level Child NAD Index.
- Child `AGENTS.md` files own domain-specific instructions and their own Child
  NAD Index.
- Each parent explains what its direct children cover and what stays owned by
  the parent.
- The closer a doc is to the work, the more specific and practical it must be.

## Child Doc Shape

Create a child `AGENTS.md` when a folder becomes a durable boundary with its
own purpose, rules, responsibilities, workflow, materials, or quality
standards.

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child NAD Index

## Style

- Keep docs concise, current, and operational.
- Document stable contracts, not diary entries.
- Put broad rules in parent docs and concrete details in child docs.
- Prefer direct bullets with explicit names.
- Do not duplicate rules across many files unless each scope needs a local
  version.
- Delete stale notes instead of explaining history.
- Trim obvious statements, repeated rules, misplaced detail, and warnings for
  risks that no longer exist.

## Closeout

1. Re-check changed paths against the NAD chain.
2. Update nearest owning docs and any affected parents or children.
3. Refresh every affected Child NAD Index.
4. Remove stale or contradictory text.
5. Run existing verification when relevant.
6. Report any docs intentionally left unchanged and why.

## User Preferences

When the user requests a durable behavior change, record it here or in the
relevant child `AGENTS.md`.

---

## NukeHub Project Guidance

## Required tooling

Install once before making changes:

- **Node.js** + npm (site build, scripts, and lint).
- **Go 1.22+** — only when modifying `api-server/`. The site itself does
  not require Go.
- **wrangler** — local Cloudflare Pages preview and deploying `dist/`. Pin
  `compatibility_date = "2026-06-10"` in `wrangler.toml` to match your local
  `workerd`; production Cloudflare always supports the latest date.

## Before committing

Run these from the repo root. They are the canonical "did I break anything"
checks — the same checks run in `.github/workflows/ci.yml` on every PR and
push to `main`:

```bash
npm run lint            # eslint . (zero errors required)
npm run format:check    # prettier check on src/**, root configs, and YAML
npm run build           # astro build — must complete and emit .md siblings
npx astro check         # typecheck (network install @astrojs/check on first run)
```

Notes:

- `npm run lint` must end with `0 errors`. Warnings in pre-existing React
  files are tolerated; do not add new ones in files you touch.
- `npm run build` invokes the `markdown-negotiation` Astro integration, which
  walks `dist/**/*.html` and writes a `.md` sibling per page. If the build log
  does not contain `[markdown-negotiation] generated .md siblings for all
pages`, the integration is broken — fix before committing.
- `npm run dev` and `npm run dev:fast` toggle `src/pages/debug/` from
  `src/debug-pages/` via `scripts/debug-pages.js`. `npm run build` always
  disables debug pages.

## Architecture pointer

High-level layout; see the Child NAD Index below for domain-specific details.

- `astro.config.mjs` — Astro config, integrations, and Vite aliases. See
  `src/AGENTS.md`.
- `src/integrations/markdown-negotiation.ts` — build-time integration that
  emits `.md` siblings. See `src/AGENTS.md`.
- `public/_worker.js` — Cloudflare Pages advanced-mode Worker for request-time
  content negotiation. See `public/AGENTS.md`.
- `wrangler.toml` — Cloudflare Pages compatibility and output config.
- `src/pages/`, `src/layouts/`, `src/components/` — Astro routes, page shells,
  and shared UI. See `src/AGENTS.md`.
- `src/modules/` — React islands grouped by feature area. See
  `src/modules/AGENTS.md`.
- `src/content/` — content collections and schemas. See
  `src/content/AGENTS.md`.
- `src/lib/` — shared TypeScript utilities, hooks, and auth. See
  `src/lib/AGENTS.md`.
- `src/data/`, `src/styles/` — static data and Tailwind v4 theme entrypoint.
  See `src/AGENTS.md`.
- `public/` — static assets and the Cloudflare Worker. See `public/AGENTS.md`.
- `scripts/` — Node.js maintenance scripts. See `scripts/AGENTS.md`.
- `api-server/` — NukeHub API server: contact form, survey, and newsletter
  endpoints, newsletter campaign sending, SMTP relay. See
  `api-server/AGENTS.md`.
- `api-server/api.nukehub.org.conf` — reverse-proxy vhost for
  `api.nukehub.org/health`, `/contact`, `/survey`, `/newsletter`, and
  `/newsletter/unsubscribe`.
- `.github/workflows/ci.yml` — PR/push CI: lint, format:check, typecheck, build.
- `.github/workflows/sync-github-stats.yml` — scheduled GitHub stats refresh.

## Deployment (Cloudflare Pages + markdown negotiation)

This is a **static** build (`output: "static"`). Two layers cooperate to
provide HTTP content negotiation:

1. **Build time** — `src/integrations/markdown-negotiation.ts` runs in the
   `astro:build:done` hook, converts every `dist/**/*.html` to Markdown via
   Turndown, and writes the result next to the source as a `.md` sibling. See
   `src/AGENTS.md` for the detailed generation rules.
2. **Request time** — `public/_worker.js` switches Cloudflare Pages into
   advanced mode. It parses `Accept` (RFC 9110 §12.5.1) and serves the matching
   `.md` sibling when `text/markdown` is preferred. See `public/AGENTS.md` for
   the detailed Worker behavior.

Each `<page>.html` URL therefore exposes three reachable representations:

- `Accept: text/html` (default) — the prerendered Astro page.
- `Accept: text/markdown` — the generated `.md` sibling.
- Direct `GET /<page>.md` — the static `.md` file (no negotiation needed).

A `<link rel="alternate" type="text/markdown" href={canonicalUrl}>` is injected
in `BaseLayout.astro` so consumers can discover the markdown variant from the
HTML itself.

Verification:

```bash
npm run build
npx wrangler pages dev dist
# in another shell:
curl -sI -H "Accept: text/markdown" http://localhost:8788/nuke-lab/   # expect text/markdown; Vary: Accept
curl -sI -H "Accept: text/html"     http://localhost:8788/nuke-lab/   # expect text/html; Vary: Accept
```

Deploy with `npx wrangler pages deploy dist`. Do not modify `dist/` directly —
it is a build artifact and ignored by git.

## Common pitfalls

- **All pages route through `BaseLayout.astro`.** A head/SEO change there
  affects every page. Add new `<link>`/`<meta>` in BaseLayout, not in
  individual page files.
- **React islands pre-hydrate to placeholders.** Live data (GitHub stars,
  animated counters) ships as `0` in the prerendered HTML — the real values
  hydrate client-side. The generated `.md` therefore shows the placeholder
  for those numbers, not the live values. Acceptable; do not try to fix by
  SSR'ing the islands.
- **`.wrangler/` is gitignored and eslint-ignored.** `npx wrangler pages dev`
  writes temp bundles under `.wrangler/tmp/`; do not commit them.
- **`wrangler.toml`'s `compatibility_date` only matters locally.** It must
  not exceed the date supported by your local `workerd` binary; Cloudflare
  production always supports the latest date.
- **Do not edit generated files.** `dist/`, `.astro/`, `node_modules/.vite/`,
  `src/routeTree.gen.ts` (if added), and any other build outputs are
  regenerated. Change source only.
- **`silent-check-sso.html` is a Keycloak artifact.** See `public/AGENTS.md`
  for the static-file exemption rule.

## Environment variables

`PUBLIC_*` variables are bundled into the static site and visible to the
browser. They are defined in `.env` (local dev) and Cloudflare Pages env vars
(production). See `.env.example` for the canonical list:

- `PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key (contact form and
  survey forms).
- `PUBLIC_API_URL` — NukeHub API origin (`https://api.nukehub.org`). The
  contact form submits to `{PUBLIC_API_URL}/contact`, survey forms to
  `{PUBLIC_API_URL}/survey`, and the admin dashboard reads from
  `{PUBLIC_API_URL}/admin`.
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token (optional).
- `PUBLIC_BLOG_URL` — NukeBlog origin (optional; defaults to
  `https://blog.nukehub.org`). The homepage `BlogSection` fetches
  `{PUBLIC_BLOG_URL}/rss.xml` client-side (see `src/lib/blog.ts`); the blog
  must send `Access-Control-Allow-Origin` for the site origin.
- `PUBLIC_AUTH_URL` / `PUBLIC_AUTH_REALM` / `PUBLIC_AUTH_CLIENT_ID`
  — NukeAuth IdP config for `src/lib/auth/NukeAuthProvider.tsx`.

Secrets for the API server (`SMTP_*`, `TURNSTILE_SECRET_KEY`,
`ALLOWED_ORIGINS`) live in the `api-server/` `.env`, never in this repo's
`.env`.

## Child NAD Index

- `src/AGENTS.md` — Astro site source: `pages/`, `layouts/`, `components/`,
  `styles/`, `data/`, `types/`, `integrations/`, plus Astro config and project
  path aliases.
- `src/content/AGENTS.md` — Astro content collections and `content.config.ts`
  schemas.
- `src/modules/AGENTS.md` — React islands grouped by feature area.
- `src/modules/survey/AGENTS.md` — YAML-driven surveys and admin dashboard.
- `src/lib/AGENTS.md` — TypeScript utilities, hooks, and auth.
- `public/AGENTS.md` — static assets and the Cloudflare Pages Worker.
- `scripts/AGENTS.md` — Node.js maintenance scripts.
- `api-server/AGENTS.md` — NukeHub API server.
