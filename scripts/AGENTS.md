# Scripts — Node.js Maintenance

## Purpose

Small Node.js scripts that automate repo maintenance: debug-pages toggle,
GitHub stats refresh, image optimization, service-worker cache injection, and
survey/newsletter seeding. Run from the repo root via `npm run <task>` or
directly with `node scripts/<file>`.

## Ownership

All files under `scripts/**`.

## Local Contracts

- ESM (`"type": "module"` in `package.json`). Use `import`, not `require`.
- Node.js APIs only (`node:fs`, `node:path`, `node:child_process`). Network
  scripts may use `fetch`.
- No TypeScript — plain `.js`/`.mjs`. Linted by `eslint.config.js` under the
  `*.mjs` and `scripts/**/*.js` slot.

## Work Guidance

### Files

- `debug-pages.js` — Toggles `src/pages/debug/` from `src/debug-pages/` for
  local dev. `--enable` copies, `--disable` removes. `npm run dev` enables;
  `npm run build` disables so debug pages never ship to production.
- `sync-github-stats.mjs` — Reads `src/content/projects/*.mdx`, fetches live
  metadata from the GitHub REST API, and writes `src/data/github-stats.json`.
  - Run locally with `GH_STATS_TOKEN=ghp_xxx node scripts/sync-github-stats.mjs`.
    Without a token, public endpoints are hit (lower rate limit).
  - In CI, `.github/workflows/sync-github-stats.yml` runs it on a schedule and
    commits the refreshed JSON back to `main`.
  - `MAX_STALE_HOURS = 24` — skips re-fetch if the cache is fresh enough.
    Override by deleting `github-stats.json`.
- `optimize-images.js` — Image compression pass over `public/assets/images/`
  using `sharp` + `glob` (dev dependencies). Run manually; not wired into CI.
- `generate-icons.mjs` — Regenerates the PWA PNG icons (`public/icon-*.png`,
  `apple-touch-icon.png`) from the SVG masters in `public/` using `sharp`.
  Artwork is scaled to 76% of the canvas to stay inside the maskable safe
  zone (80% diameter circle) so Android launcher masks don't crop the logo.
  Output is palette PNG (`quality: 100, dither: 0`) — lossless for the
  flat-color artwork, so `optimize-images.js` (lossy q80) must not be run on
  the icons. Run `node scripts/generate-icons.mjs` after any logo change.
- `inject-sw-cache.js` — Generates `public/sw.js` from `public/sw.js.tpl`,
  injecting a per-build cache name. Wired as `npm run prebuild` so every
  production build gets a fresh service-worker cache key. The generated
  `public/sw.js` is gitignored.
- `seed-surveys.mjs` — Seeds the `api-server` SQLite database with demo survey
  submissions for local UI/UX testing. Reads survey YAMLs from
  `src/content/surveys/`, generates responses matching each question type, and
  inserts them into `api-server/data/nukehub.db`.
  - `npm run seed:surveys` seeds 200 submissions for a synthetic `demo` survey.
  - `npm run seed:surveys -- --survey nukehub-experience` seeds a real slug.
  - `npm run seed:surveys -- --count 1000 --survey nukehub-experience`
    overrides the count.
  - `npm run seed:surveys -- --clean` removes existing submissions before
    seeding.
- `seed-newsletter.mjs` — Seeds the `api-server` SQLite database with demo
  newsletter subscribers, campaigns, and deliveries for local admin-dashboard
  testing. Creates the newsletter tables if missing (including the `source`
  column on campaigns).
  - `npm run seed:newsletter` seeds 150 subscribers and 4 campaigns (1 draft,
    2 sent manual, 1 sent `blog-rss`) with deliveries, ~3% marked failed.
  - `npm run seed:newsletter -- --count 500` overrides the subscriber count.
  - `npm run seed:newsletter -- --clean` wipes all newsletter tables first.
  - `npm run seed:newsletter -- --db /path/to.db` targets another database.

### Adding a script

1. Add `scripts/<name>.{js,mjs}` here.
2. If it should run from `npm run`, wire a `scripts` entry in `package.json`.
3. If it writes back to the repo (like `sync-github-stats.mjs`), add a
   matching workflow under `.github/workflows/`.
4. Scripts that need TypeScript should graduate into `src/lib/` and be
   invoked from a thin `.mjs` here.

### Common pitfalls

- **`sync-github-stats.mjs` commits to `main` from CI.** Bump
  `MAX_STALE_HOURS` deliberately; never set it to 0.
- **Do not invoke these scripts from inside `astro dev` / `astro build`.**
  They are repo-state mutations; the Astro process should only read the
  resulting artifacts.
- **No side effects beyond documented outputs.** Each script should leave the
  repo in a committable state on success and print what it changed.

## Verification

See the root NAD "Before committing" for the canonical checks. Scripts can
also be exercised directly:

```bash
node scripts/debug-pages.js --enable && node scripts/debug-pages.js --disable
GH_STATS_TOKEN=... node scripts/sync-github-stats.mjs
node scripts/optimize-images.js
node scripts/inject-sw-cache.js
npm run seed:surveys
npm run seed:newsletter
```

## Child NAD Index

- None.
