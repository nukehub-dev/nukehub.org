/**
 * Theme engine — shared utilities for dark/light/system mode and accent colors.
 *
 * Storage keys:
 *   - localStorage.theme        → 'light' | 'dark' | 'system'
 *   - localStorage.accent       → 'red' | 'orange' | 'green' | 'cyan' | 'purple'
 *
 * The <html> element always carries the *resolved* theme:
 *   - data-theme="light" | "dark"
 *   - data-accent="<name>"
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type AccentColor = "red" | "orange" | "green" | "cyan" | "purple";

export interface AccentSwatch {
  name: AccentColor;
  hue: number;
  label: string;
}

export const ACCENT_SWATCHES: AccentSwatch[] = [
  { name: "red", hue: 27, label: "Red" },
  { name: "orange", hue: 48, label: "Orange" },
  { name: "green", hue: 144, label: "Green" },
  { name: "cyan", hue: 211, label: "Cyan" },
  { name: "purple", hue: 321, label: "Purple" },
];

const THEME_KEY = "theme";
const ACCENT_KEY = "accent";

/**
 * Resolve a theme preference to an actual light/dark value.
 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system" || !preference) {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
}

/**
 * Read the user's stored theme preference (may be 'system').
 */
export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

/**
 * Read the resolved theme (always light or dark).
 */
export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(getThemePreference());
}

/**
 * Apply a theme preference to the document.
 * Stores the preference and updates data-theme with the resolved value.
 */
export function setThemePreference(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem(THEME_KEY, preference);
  updateMetaThemeColor();
}

/**
 * Read the stored accent color.
 */
export function getAccentColor(): AccentColor {
  if (typeof window === "undefined") return "orange";
  const stored = localStorage.getItem(ACCENT_KEY);
  const valid: AccentColor[] = ["red", "orange", "green", "cyan", "purple"];
  if (valid.includes(stored as AccentColor)) {
    return stored as AccentColor;
  }
  return "orange";
}

/**
 * Apply an accent color to the document.
 */
export function setAccentColor(color: AccentColor): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-accent", color);
  localStorage.setItem(ACCENT_KEY, color);
  updateMetaThemeColor();
}

/**
 * Cycle through themes: light → dark → system → light
 */
export function cycleTheme(current: ThemePreference): ThemePreference {
  const order: ThemePreference[] = ["light", "dark", "system"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

import { updateFavicon, updateThemeColor } from "./favicon";

/**
 * Update the <meta name="theme-color"> tag and favicon to match the current
 * resolved theme and accent color.
 */
export function updateMetaThemeColor(): void {
  if (typeof document === "undefined") return;

  updateThemeColor();
  updateFavicon();
}

/**
 * Subscribe to system-level dark-mode changes.
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(
  callback: (resolved: ResolvedTheme) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent | MediaQueryList) => {
    callback(e.matches ? "dark" : "light");
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
