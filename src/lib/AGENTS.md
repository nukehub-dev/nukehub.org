# Lib — Utilities, Hooks, Auth

## Purpose

Cross-cutting TypeScript utilities, React hooks, and the Keycloak auth
provider that are shared across `src/components/` and `src/modules/`.

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
- `icons.ts` — icon-name → lucide component map for dynamic icons.
- `loadYaml.ts` — YAML loader helper used by data layers.
- `github.ts` — GitHub API helpers (used by `scripts/sync-github-stats.mjs`
  and the GitHub stats overlay path).
- `og.tsx` — Satori JSX factory used by `src/pages/og/*.png.ts` to compose
  OG cards. Keep it side-effect free and synchronous per Satori's contract.
- `useCommandPalette.ts` — command palette state/hook driving
  `src/components/shared/CommandPalette*.tsx`.
- `useCountUp.ts` — animated number counting hook (drives stat cards).
- `usePrefersReducedMotion.ts` — `prefers-reduced-motion` reader; all motion
  islands must respect it.
- `useFocusTrap.ts` — focus trap for modals/menus (accessibility).
- `useWebGL.ts` — WebGL/Three.js lifecycle helper used by home hero.
- `auth/KeycloakProvider.tsx` — the single auth provider.

### Keycloak auth provider

`src/lib/auth/KeycloakProvider.tsx` wires `keycloak-js` to a React context.
Build-time config comes from `PUBLIC_KEYCLOAK_URL`,
`PUBLIC_KEYCLOAK_REALM`, `PUBLIC_KEYCLOAK_CLIENT_ID`. (See root NAD
"Environment variables".)

- **Silent SSO** uses `public/silent-check-sso.html` as the iframe check
  target. See `public/AGENTS.md` for the static-file exemption rule.
- Components consume auth via the provider's `useAuth()` hook (re-exported
  alongside the provider). Do not call `keycloak-js` directly from islands —
  go through the context.

### Adding a utility

1. Place it in `src/lib/` (top-level file by default, or
   `src/lib/<topic>/` for a cluster of related files).
2. Re-export from an existing entry if there is one; otherwise the new file
   is fine on its own.
3. If the util becomes consumed by multiple modules, prefer promoting to
   shared `src/components/` for UI or keeping here for non-UI. Do not let
   `src/modules/<feature>/` vend private copies of lib helpers.

### Common pitfalls

- **Do not import from `src/modules/` here.** Lib is bottom-of-stack; cycles
  into modules break the build.
- **`@resvg/resvg-js` and `satori` are server-only.** They belong in
  `src/pages/og/*.png.ts`; only the JSX composition helpers
  (e.g. `og.tsx`) may live here.
- **Hooks that read browser-only APIs** must guard against SSR/prerender
  (Astro prerenders the `.astro` shell). Defaults and the
  `usePrefersReducedMotion` pattern show the safe shape.

## Verification

```bash
npm run lint
npx astro check
```

## Child NAD Index

- None.
