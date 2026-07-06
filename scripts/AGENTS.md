# Scripts — Node.js Maintenance

## Purpose

Small Node.js scripts that automate repo maintenance: debug-pages toggle,
GitHub stats refresh, and image optimization. Run from the repo root via
`npm run <task>` or directly with `node scripts/<file>`.

## Ownership

All files under `scripts/**`.

## Local Contracts

- ESM (`"type": "module"` in `package.json`). Use `import`, not `require`.
- Node.js APIs only (`node:fs`, `node:path`, `node:child_process`). Network
  scripts may use `fetch` (available in Node 18+).
- No TypeScript — plain `.js`/`.mjs`. Linted by `eslint.config.js` under the
  `*.mjs` and `scripts/**/*.js` slot.

## Work Guidance

### Files

- `debug-pages.js` — Toggles `src/pages/debug/` from `src/debug-pages/` for
  local dev. `--enable` copies, `--disable` removes. `npm run dev` enables;
  `npm run build` disables (so debug pages never ship to production). See
  `src/AGENTS.md` for the contract.
- `sync-github-stats.mjs` — Reads `src/content/projects/*.mdx`, fetches live
  metadata from the GitHub REST API, and writes `src/data/github-stats.json`.
  - Run locally with `GH_STATS_TOKEN=ghp_xxx node scripts/sync-github-stats.mjs`.
    Without a token, public endpoints are hit (lower rate limit).
  - In CI, `.github/workflows/sync-github-stats.yml` runs it on a schedule and
    commits the refreshed JSON back to `main` (the only "data refresh"
    mechanism in this repo).
  - `MAX_STALE_HOURS = 24` — the script skips re-fetch if the cache is fresh
    enough. Override by deleting `github-stats.json`.
- `optimize-images.js` — Image compression pass over `public/assets/images/`
  using `sharp` + `glob` (dev dependencies). Run manually; not wired into CI.
- `inject-sw-cache.js` — Generates `public/sw.js` from `public/sw.js.tpl`,
  injecting a per-build cache name (`nukehub-<version>-<timestamp>`). Wired as
  `npm run prebuild` so every production build gets a fresh service-worker
  cache key. The generated `public/sw.js` is gitignored.

### Adding a script

1. Add `scripts/<name>.{js,mjs}` here.
2. If it should run from `npm run`, wire a `scripts` entry in `package.json`.
3. If it writes back to the repo (like `sync-github-stats.mjs`), add a
   matching workflow under `.github/workflows/` and document it in the root
   NAD.
4. Scripts that need TypeScript should graduate into `src/lib/` and be
   invoked from a thin `.mjs` here — keep `scripts/` digestible for ad-hoc
   maintenance.

### Common pitfalls

- **`sync-github-stats.mjs` commits to `main` from CI.** Editing it touches
  the production data flow. Bump `MAX_STALE_HOURS` deliberately, never to 0,
  or the workflow will run on every push.
- **Do not invoke these scripts from inside `astro dev` / `astro build`.**
  They are repo-state mutations; the Astro process should only read the
  resulting artifacts (`github-stats.json` etc).
- **No side effects beyond documented outputs.** Each script should leave the
  repo in a committable state on success and print what it changed.

## Verification

```bash
node scripts/debug-pages.js --enable && node scripts/debug-pages.js --disable
GH_STATS_TOKEN=... node scripts/sync-github-stats.mjs
node scripts/optimize-images.js
node scripts/inject-sw-cache.js
```

## Child NAD Index

- None.
