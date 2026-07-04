# React Islands

## Purpose

Client-rendered React islands grouped by feature area. Each module owns the
interactive UI for one site page or section. Astro prerenders shells; React
hydrates the rich interactions.

## Ownership

All files under `src/modules/**` except generated artifacts (`dist/`,
`.astro/`). Per-module `components/` subfolders hold their own islands.

## Local Contracts

- React 19, TypeScript ~6, Tailwind CSS v4. Hydrate via `client:*`
  directives in the parent `.astro` page; never SSR interactive state.
- Common dependencies shared across modules: `framer-motion` (motion),
  `lucide-react` (icons), `clsx` + `tailwind-merge` (className composition),
  `class-variance-authority` (variants). `fullcalendar/*` is loaded by the
  events module only. `@react-three/fiber` / `drei` / `postprocessing` is
  loaded by `home/components/three` only; keep it out of other modules'
  bundles.
- Cross-module imports are allowed but prefer the shared layer in
  `src/components/` and `src/lib/`. When a module's hook/util becomes shared,
  graduate it to `src/lib/` and import from there.

## Work Guidance

### Module map

- `home/` — landing page islands: hero, stats, projects grid, integrations,
  testimonials carousel, mission strip, CTA. `components/three/` holds the
  WebGL hero background. `data/` holds page-local data; `types/` local types.
- `projects/` — Per-project submodules render the marketing page for each
  flagship product:
  - `nuke-lab/components/NukelabPage.tsx`
  - `nuke-ide/components/NukeidePage.tsx`
  - `nuke-analytics/components/NukeanalyticsPage.tsx`
  - `nrms/components/NrmsPage.tsx`
    Each is one top-level island configured from the `projects` collection +
    local `data/`. Stat counters hydrate from placeholders; do not SSR them.
- `about/` — about page (story, mission, values, SDGs). `components/` holds
  the section islands.
- `roadmap/` — roadmap entries listing with status badges.
- `changelog/` — changelog timeline.
- `people/` — people grid grouped by category; uses `peopleCategories`.
- `events/` — calendar view via FullCalendar; `lib/` and `hooks/` hold the
  recurrence expansion logic that drives the calendar from the `events`
  collection.
- `support/` — sponsorship tiers + donation cards.
- `contact/` — contact form + modal. Uses Cloudflare Turnstile
  (`@marsidev/react-turnstile`) for CAPTCHA; submits to `PUBLIC_CONTACT_API_URL`.
- `sponsors/` — sponsor row rendering.
- `acknowledgment/` — acknowledgment list.
- `manual/` — manual/legal pages emitted from the `manual` collection.
- `debug/` — debug-only islands for local development; under
  `src/debug-pages/` until `scripts/debug-pages.js --enable` copies the page
  wrapper into `src/pages/debug/`. Never ship debug code to production.

### Adding a module

1. Create `src/modules/<feature>/` with `components/` and any `data/`,
   `lib/`, `hooks/`, `types/` subdirs as needed.
2. Render the island from the matching `src/pages/<feature>.astro` page using
   a `client:*` directive.
3. If the module reaches the `projects`/`people`/etc. collections, do it via
   `getCollection` in the `.astro` page and pass props to the island (keeps it
   SSR-friendly / hydration-fast).
4. Update the module list above.

### State and data fetching

- Islands own their interactive state. Pass static config in as props from
  the `.astro` page; push fetch-live-data into hooks in `src/lib/`.
- Reusable hooks (`useCountUp`, `usePrefersReducedMotion`, `useFocusTrap`,
  `useWebGL`, `useCommandPalette`) live in `src/lib/`; see `src/lib/AGENTS.md`.
- The GitHub stats overlay (`src/components/shared/GitHubStatsOverlay.tsx`)
  hydrates its numbers client-side from `src/data/github-stats.json`.

### Styling

- Tailwind utility classes only. Avoid arbitrary values; extend theme tokens
  in `src/styles/global.css` when a value repeats.
- `clsx`/`tailwind-merge` for conditional className composition;
  `class-variance-authority` for variants on `src/components/ui/*`.
- Dark mode is class-based (`dark:` variants driven by `ThemeToggle`); do not
  gate layout on `prefers-color-scheme`.

### Common pitfalls

- **Stat counters render `0` pre-hydration.** The negotiated markdown shows
  `0` for these — do not try to SSR the actual values. See root NAD
  "React islands pre-hydrate to placeholders."
- **FullCalendar and three.js are heavy.** Lazy-load via `lazy/` wrappers in
  `src/components/shared/lazy/` (already in place); adding direct imports
  bloats the home bundle.
- **Per-project pages each have a `<feature>Page.tsx`.** Do not fold all
  projects into one shared component — each owns distinct marketing content.

## Verification

```bash
npm run lint
npm run build         # islands must compile + hydrate
```

## Child NAD Index

- None (per-module `components/` folders are not durable boundaries — schema
  lives in `src/content/AGENTS.md`, shared UI in `src/AGENTS.md`).
