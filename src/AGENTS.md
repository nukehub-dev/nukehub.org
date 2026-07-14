# Astro Site Source

## Purpose

The live Astro application: routes, layouts, shared components, global
styles, static data, type declarations, and build-time integrations.

## Ownership

All files under `src/` except `src/content/` (own NAD), `src/modules/` (own
NAD), and `src/lib/` (own NAD). Also owns `astro.config.mjs`,
`tsconfig.json`, `eslint.config.js`, `.prettierrc`.

## Local Contracts

- Astro 6 static output (`output: "static"`). Every route is prerendered to
  `dist/**`.
- React islands via `@astrojs/react`; MDX via `@astrojs/mdx`; sitemap via
  `@astrojs/sitemap`; Tailwind v4 via `@tailwindcss/vite`.
- Path aliases (declared in `astro.config.mjs`): `@components`, `@layouts`,
  `@data`, `@styles`, `@lib`, `@content`, `@modules`. Use aliases; avoid
  relative paths beyond a single `./` jump.
- TypeScript ~6, strict; `tsconfig.json` references `astro.tsclient`.
- ESLint flat config (`eslint.config.js`); `.wrangler/**` and `dist/**` are
  ignored. `no-undef` is off for `.ts/.tsx/.astro` because TS already covers it.
- Prettier with `prettier-plugin-astro`; formats
  `src/**/*.{ts,tsx,astro,css,scss,json,md,yml,yaml}` and root configs.

## Work Guidance

### Project structure

- `src/pages/` — Astro routes. One `.astro` per URL; `[...slug].astro` renders
  non-`customPage` entries from the `projects` collection.
- `src/pages/admin/` — admin area: `/admin/` is a role-filtered landing page
  (`src/components/shared/AdminLanding.tsx`); `/admin/surveys/` and
  `/admin/newsletter/` belong to their module NADs. The account menu
  (`UserAuthMenu.tsx`) shows an "Administration" section with the same links
  when the user has any admin role.
- `src/pages/surveys/` — survey routes. See `src/modules/survey/AGENTS.md`.
- `src/pages/og/` — dynamic OpenGraph PNG endpoints (`.png.ts`). They use
  Satori + ResVG. `@resvg/resvg-js` is `optimizeDeps.exclude` and
  `vite.ssr.external` — keep it out of the browser bundle.
- `src/layouts/BaseLayout.astro` — every page funnels through here. Owns the
  `<head>`, SEO meta, the alternate link, global chrome, and the `AuthHeader` /
  `Footer` frame. New `<link>`/`<meta>` go here, not in individual pages.
- `src/layouts/PageLayout.astro` — prose-content wrapper over BaseLayout for
  collection-rendered pages.
- `src/components/layout/` — site frame: `Header`, `Footer`, `AuthHeader`,
  `Container`.
- `src/components/shared/` — global UI/islands: cursor, scroll progress,
  command palette, contact modal/form, newsletter signup, theme toggle, error
  boundary, page loader, GitHub stats overlay, analytics, grain overlay, glass
  context menu.
- `src/components/ui/` — visual primitives: `Button`, `Card`, `Badge`,
  `Tooltip`, `Logo`, `Image`, `SearchInput`, `BrandIcon`, `Input`, `Textarea`,
  `Select`, `Label`, `Checkbox`, `RadioGroup`, `CharacterCount`.
- `src/components/illustrations/` — decorative illustration components.
- `src/components/status/` — status badges / state indicators.
- `src/data/` — typed static data: `nav.tsx`, `footer.ts`, and
  `github-stats.json` (a build-time cache, see `scripts/AGENTS.md`).
- `src/styles/global.css` — Tailwind v4 entry and theme tokens. Theme
  customization goes here.
- `src/types/declarations.d.ts` — ambient type declarations for untyped
  modules.
- `src/integrations/markdown-negotiation.ts` — the build-time integration.

### Adding a route

1. Create `src/pages/<name>.astro`.
2. Wrap in `BaseLayout` (directly) or `PageLayout` (for prose). Always pass
   `permalink`, `title`, `description`, optional `image`/`ogImage`.
3. For collection-backed content (e.g. `projects`), do **not** create a
   per-entry page — use `[...slug].astro`.
4. Add an OG image endpoint to `src/pages/og/` only if the page needs a custom
   card beyond the BaseLayout default.

### markdown-negotiation integration

`src/integrations/markdown-negotiation.ts` is registered in
`astro.config.mjs` and runs on `astro:build:done`. It walks `dist/**/*.html`
and writes a `.md` sibling per page, stripping UI chrome, card anchors, and
icon-only links. The full negotiation system is described in the root NAD's
Deployment section; request-time behavior lives in `public/AGENTS.md`.

When you add a new UI-chrome class, add it to `CHROME_CLASS_SUBSTRINGS` so the
generated markdown does not leak it.

### Astro config stays minimal

`astro.config.mjs` only lists integrations, the static output flag, prefetch
strategy, image domains, and Vite plugins/aliases. Do not add adapter imports —
this site is static-only. Cloudflare Pages is handled by `public/_worker.js`
(see `public/AGENTS.md`), not by `@astrojs/cloudflare`.

### UI primitives

The project does not use a generic component library. Build custom components
in `src/components/ui/` when a new primitive is needed. Do not rely on
browser-built-in UI (native `title` tooltips, default `<select>` dropdowns,
unstyled `<dialog>`, `window.alert`) for product UX — use project components
such as `Tooltip` and `Dialog`.

### Common pitfalls

- **`silent-check-sso.html` lives under `public/`**, not `src/pages/`. See
  `public/AGENTS.md`.
- **`@resvg/resvg-js` is native and server-only.** Keep imports inside
  `src/pages/og/*.png.ts`.
- **`src/pages/debug/` is generated.** Never check files in there directly —
  `scripts/debug-pages.js` copies them from `src/debug-pages/` only for dev.
  `npm run build` removes the dir.
- **Do not import from `src/modules/` in `src/lib/`.** Lib is bottom-of-stack;
  cycles break the build.

## Verification

See the root NAD "Before committing" for the canonical checks:

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
