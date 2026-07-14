# Lib — Utilities, Hooks, Auth

## Purpose

Cross-cutting TypeScript utilities, React hooks, and the Keycloak auth
provider shared across `src/components/` and `src/modules/`.

## Ownership

All files under `src/lib/**`.

## Local Contracts

- TypeScript ~6, strict; no Astro/React entry points here — only
  framework-friendly helpers.
- Pure utilities and hooks only. Do not create a module that has its own page
  rendering — graduate it to `src/modules/` instead.

## Work Guidance

### Files

- `utils.ts` — `cn()` (clsx + tailwind-merge), small shared helpers.
- `animations.ts` — framer-motion variants shared by islands.
- `theme.ts`, `themeColors.ts` — theme token helpers (drives `ThemeToggle`).
- `favicon.ts` — runtime favicon generator; reads CSS `--primary` /
  `--background` and renders a data-URI SVG tab icon.
- `icons.ts` — icon-name → lucide component map for dynamic icons.
- `loadYaml.ts` — YAML loader helper used by data layers.
- `github.ts` — GitHub API helpers (used by `scripts/sync-github-stats.mjs`
  and the GitHub stats overlay path).
- `projects.ts` — project collection helpers and derived data.
- `og.tsx` — Satori JSX factory used by `src/pages/og/*.png.ts` to compose
  OG cards. Keep it side-effect free and synchronous per Satori's contract.
- `useCommandPalette.ts` — command palette state/hook.
- `useCountUp.ts` — animated number counting hook.
- `usePrefersReducedMotion.ts` — `prefers-reduced-motion` reader; all motion
  islands must respect it.
- `useFocusTrap.ts` — focus trap for modals/menus.
- `useWebGL.ts` — WebGL/Three.js lifecycle helper used by home hero.
- `auth/NukeAuthProvider.tsx` — the single auth provider. Exposes the Keycloak
  access token via `useAuth().token` and a `hasRole(role)` helper.
- `auth/roles.ts` — NukeAuth client role names for the admin areas
  (`survey-admin`/`survey-viewer`, `newsletter-admin`/`newsletter-staff`) and
  `hasAnyRole`. Mirrors the role constants in `api-server/internal/auth` —
  keep both sides in sync. Access is always enforced server-side; these only
  show or hide admin UI.

### NukeAuth provider

`src/lib/auth/NukeAuthProvider.tsx` wires `keycloak-js` to a React context.
Build-time config comes from `PUBLIC_AUTH_URL`, `PUBLIC_AUTH_REALM`,
`PUBLIC_AUTH_CLIENT_ID`. (See root NAD "Environment variables".)

- **Silent SSO** uses `public/silent-check-sso.html` as the iframe check
  target. See `public/AGENTS.md`.
- Components consume auth via the provider's `useAuth()` hook. Do not call
  `keycloak-js` directly from islands.

### Adding a utility

1. Place it in `src/lib/` (top-level file by default, or `src/lib/<topic>/`
   for a cluster of related files).
2. Re-export from an existing entry if there is one; otherwise the new file is
   fine on its own.
3. If the util becomes consumed by multiple modules, prefer promoting to
   shared `src/components/` for UI or keeping here for non-UI. Do not let
   `src/modules/<feature>/` vend private copies of lib helpers.

### Common pitfalls

- **Do not import from `src/modules/` here.** Lib is bottom-of-stack; cycles
  into modules break the build.
- **`@resvg/resvg-js` and `satori` are server-only.** They belong in
  `src/pages/og/*.png.ts`; only the JSX composition helpers (e.g. `og.tsx`)
  may live here.
- **Hooks that read browser-only APIs** must guard against SSR/prerender
  (Astro prerenders the `.astro` shell). Follow the
  `usePrefersReducedMotion` pattern.

## Verification

See the root NAD "Before committing" for the canonical checks:

```bash
npm run lint
npx astro check
```

## Child NAD Index

- None.
