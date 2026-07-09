# React Islands

## Purpose

Client-rendered React islands grouped by feature area. Each module owns the
interactive UI for one site page or section.

## Ownership

All files under `src/modules/**`. Per-module `components/` subfolders hold
their own islands.

## Local Contracts

- React 19, TypeScript ~6, Tailwind CSS v4. Hydrate via `client:*`
  directives in the parent `.astro` page; never SSR interactive state.
- Common dependencies: `framer-motion`, `lucide-react`, `clsx` +
  `tailwind-merge`, `class-variance-authority`. `fullcalendar/*` is loaded by
  the events module only. `@react-three/fiber` / `drei` / `postprocessing` is
  loaded by `home/components/three` only; keep it out of other modules' bundles.
- Cross-module imports are allowed but prefer the shared layer in
  `src/components/` and `src/lib/`. When a module's hook/util becomes shared,
  graduate it to `src/lib/`.

## Work Guidance

### Module map

- `home/` — landing page islands: hero, stats, projects grid, integrations,
  testimonials carousel, mission strip, CTA. `components/three/` holds the
  WebGL hero background. `data/` holds page-local data; `types/` local types.
- `projects/` — per-project submodules render the marketing page for each
  flagship product:
  - `nuke-lab/components/NukelabPage.tsx`
  - `nuke-ide/components/NukeidePage.tsx`
  - `nuke-analytics/components/NukeAnalyticsPage.tsx`
  - `nrms/components/NrmsPage.tsx`
  - `components/` holds shared project UI (`ProjectsFilterGrid`,
    `IntegrationsFilter`, `ProjectsHero`, etc.).
    Stat counters hydrate from placeholders; do not SSR them.
- `about/` — about page (story, mission, values, SDGs).
- `roadmap/` — roadmap entries listing with status badges.
- `changelog/` — changelog timeline.
- `people/` — people grid grouped by category.
- `events/` — calendar view via FullCalendar; `lib/` and `hooks/` hold the
  recurrence expansion logic.
- `support/` — sponsorship tiers + donation cards.
- `contact/` — contact form + modal. Uses Cloudflare Turnstile and submits to
  `{PUBLIC_API_URL}/contact`.
- `sponsors/` — sponsor row rendering.
- `acknowledgment/` — acknowledgment list.
- `manual/` — manual/legal pages emitted from the `manual` collection.
- `survey/` — YAML-driven survey forms. See
  `src/modules/survey/AGENTS.md`.
- `debug/` — debug-only islands for local development; source pages live under
  `src/debug-pages/` until `scripts/debug-pages.js --enable` copies them into
  `src/pages/debug/`. Never ship debug code to production.

### Adding a module

1. Create `src/modules/<feature>/` with `components/` and any `data/`, `lib/`,
   `hooks/`, `types/` subdirs as needed.
2. Render the island from the matching `src/pages/<feature>.astro` page using
   a `client:*` directive.
3. If the module reads the `projects`/`people`/etc. collections, do it via
   `getCollection` in the `.astro` page and pass props to the island.
4. Update the module list above.

### State and data fetching

- Islands own their interactive state. Pass static config in as props from the
  `.astro` page; push fetch-live-data into hooks in `src/lib/`.
- Reusable hooks live in `src/lib/`; see `src/lib/AGENTS.md`.
- The GitHub stats overlay hydrates its numbers client-side from
  `src/data/github-stats.json`.

### Styling

- Tailwind utility classes only. Avoid arbitrary values; extend theme tokens in
  `src/styles/global.css` when a value repeats.
- `clsx`/`tailwind-merge` for conditional className composition;
  `class-variance-authority` for variants on `src/components/ui/*`.
- Dark mode is class-based (`dark:` variants driven by `ThemeToggle`); do not
  gate layout on `prefers-color-scheme`.

### Common pitfalls

- **Stat counters render `0` pre-hydration.** See root NAD "React islands
  pre-hydrate to placeholders."
- **FullCalendar and three.js are heavy.** Lazy-load via `lazy/` wrappers in
  `src/components/shared/lazy/`; adding direct imports bloats the home bundle.
- **Per-project pages each have a `<feature>Page.tsx`.** Do not fold all
  projects into one shared component — each owns distinct marketing content.

## Verification

See the root NAD "Before committing" for the canonical checks:

```bash
npm run lint
npm run build
```

## Child NAD Index

- `src/modules/survey/AGENTS.md` — YAML-driven surveys and admin dashboard.
