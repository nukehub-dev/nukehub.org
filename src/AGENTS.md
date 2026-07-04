# Astro Site Source

## Purpose

The live Astro application: routes, layouts, shared components, global
styles, static data, type declarations, and build-time integrations. This is
the layer that turns content + modules into the prerendered static site.

## Ownership

All files under `src/` except `src/content/` (own NAD), `src/modules/` (own
NAD), and `src/lib/` (own NAD). Also owns `astro.config.mjs`,
`tsconfig.json`, `eslint.config.js`, `.prettierrc`.

## Local Contracts

- Astro 6 static output (`output: "static"`). Every route is prerendered to
  `dist/**`.
- React islands via `@astrojs/react`; MDX content via `@astrojs/mdx`;
  sitemap via `@astrojs/sitemap`; Tailwind v4 via `@tailwindcss/vite`.
- Path aliases (declared in `astro.config.mjs`):
  `@components`, `@layouts`, `@data`, `@styles`, `@lib`, `@content`,
  `@modules`. Use aliases, never relative paths beyond a single `./` jump.
- TypeScript ~6, strict; `tsconfig.json` references `astro.tsclient`.
- ESLint flat config (`eslint.config.js`); `.wrangler/**` and `dist/**` are
  ignored. `no-undef` is off for `.ts/.tsx/.astro` because TS already covers it.
- Prettier with `prettier-plugin-astro`; formats `src/**/*.{ts,tsx,astro,css,scss,json,md}` and root `*.json`/`*.md`.

## Work Guidance

### Project structure

- `src/pages/` — Astro routes. One `.astro` per URL; `[...slug].astro` is the
  catch-all that renders non-`customPage` entries from the `projects`
  collection. Filename → URL (e.g. `nuke-lab.astro` → `/nuke-lab`,
  `about.astro` → `/about`).
- `src/pages/og/` — Dynamic OpenGraph PNG endpoints (`.png.ts`). They use
  Satori + ResVG to render OG cards. `@resvg/resvg-js` is `optimizeDeps.exclude`
  and `vite.ssr.external` — do not move it into the browser bundle.
- `src/layouts/BaseLayout.astro` — every page funnels through here. Owns the
  `<head>`, SEO meta, the alternate link, global chrome (cursor, grain, page
  loader, command palette, cookie consent, error boundary), and the `AuthHeader`
  / `Footer` frame. New `<link>`/`<meta>` go here, not in individual pages.
- `src/layouts/PageLayout.astro` — prose-content wrapper over BaseLayout for
  collection-rendered pages (the projects catch-all, `roadmap`, `changelog`,
  `projects` index).
- `src/components/layout/` — site frame: `Header`, `Footer`, `AuthHeader`,
  `Container`.
- `src/components/shared/` — global UI/islands: cursor, scroll progress,
  command palette, contact modal/form, theme toggle, error boundary, page
  loader, GitHub stats overlay, analytics, grain overlay, glass context menu.
  `decorations/` and `lazy/` are subgroups.
- `src/components/ui/` — visual primitives: `Button`, `Card`, `Badge`,
  `Logo`, `Image`, `SearchInput`, `BrandIcon`. The Astro `Image.astro` and
  React `Image.tsx` pair wraps `<img>` with consistent sizing/loading.
- `src/components/illustrations/` — decorative illustration components.
- `src/components/status/` — status badges / state indicators.
- `src/data/` — typed static data: `nav.tsx`, `footer.ts`, and
  `github-stats.json` (a build-time cache, see `scripts/AGENTS.md`).
- `src/styles/global.css` — Tailwind v4 entry (`@import "tailwindcss"`) and
  theme tokens / base styles. Theme customization goes here, not in scattered
  utility classes.
- `src/types/declarations.d.ts` — ambient type declarations for untyped
  modules (e.g. `culori`, `lenis`, `three`).
- `src/integrations/markdown-negotiation.ts` — the build-time integration; see
  the contract below.

### Adding a route

1. Create `src/pages/<name>.astro` (or a route file matching Astro plumbing).
2. Wrap in `BaseLayout` (directly) or `PageLayout` (for prose). Always pass
   `permalink`, `title`, `description`, optional `image`/`ogImage`.
3. For collection-backed content (e.g. `projects`), do **not** create a
   per-entry page — use `[...slug].astro` which already enumerates them.
4. Add OG image endpoint to `src/pages/og/` only if the page needs a custom
   card beyond the BaseLayout default.
5. `npm run dev` (`astro dev`) hot-reloads; `npm run build` verifies static
   emission + `.md` siblings.

### markdown-negotiation integration

`src/integrations/markdown-negotiation.ts` is the build-time hook. It is
registered in `astro.config.mjs` and runs on `astro:build:done`. Contract:

- Walks `dist/**/*.html` and writes a `.md` sibling per page.
- Skips: `404.html`, `silent-check-sso.html`, `rss.xml`.
- Strips UI chrome (`grain-overlay`, `scroll-progress`, `custom-cursor`,
  `page-loader`, `command-palette`, `cookie-consent`, `error-boundary`,
  `scroll-top`, `context-menu`, `performance-monitor`), `aria-hidden="true"`
  decorations, and `id="stat-*"` placeholder blocks.
- Flattens "card anchors" (`<a>` wrapping block content) into block markdown
  - a trailing `[→ /path](/path)` reference link.
- Replaces icon-only anchors with labeled reference links using `aria-label`.
- Replaces inline `<svg>` with a single space (so adjacent text/labels don't
  concatenate after stripping), and converts `<br>` to blank lines.
- Emits frontmatter (`title`, `description`) extracted from `<title>` and
  `<meta name="description">`; strips the `| NukeHub` site suffix.
- Post-process: unescape `\_` (we use `*` for emphasis, so bare underscores in
  identifiers are safe), insert a separator between adjacent inline links /
  autolinks, blank-line between adjacent images, collapse 3+ blank lines.

When you add a new UI-chrome class, add it to `CHROME_CLASS_SUBSTRINGS` so the
negotiated markdown does not leak it.

### Astro config stays minimal

`astro.config.mjs` only lists integrations, the static output flag, prefetch
strategy, image domains, and Vite plugins/aliases. Do not add adapter
imports — this site is static-only. Cloudflare Pages is handled by
`public/_worker.js` (see `public/AGENTS.md`), not by `@astrojs/cloudflare`.

### Common pitfalls

- **`silent-check-sso.html` lives under `public/`**, not `src/pages/`. It is a
  Keycloak iframe artifact and must stay raw HTML — do not wrap it in
  BaseLayout, do not emit `.md` for it.
- **`@resvg/resvg-js` is native.** It is excluded from Vite's `optimizeDeps`
  and marked `ssr.external`. If you import it from a route, keep the import on
  the server side (it's only used in `src/pages/og/*.png.ts`).
- **`src/pages/debug/` is generated.** Never check files in there directly —
  `scripts/debug-pages.js` copies them from `src/debug-pages/` only for dev.
  `npm run build` always disables (removes) the dir.

## Verification

```bash
npm run lint
npm run format:check
npm run build
npx astro check
```

## Child NAD Index

- `src/content/AGENTS.md` — content collections.
- `src/modules/AGENTS.md` — React islands.
- `src/lib/AGENTS.md` — utilities, hooks, auth.
