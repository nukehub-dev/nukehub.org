import { oklch, formatHex } from "culori";

/**
 * Read the current --primary CSS custom property and convert it from oklch
 * to a hex string suitable for Three.js, Canvas 2D, etc.
 */
export function getPrimaryColor(fallback = "#f37524"): string {
  if (typeof document === "undefined") return fallback;

  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue("--primary").trim();
  if (!primary) return fallback;

  try {
    const parsed = oklch(primary);
    if (!parsed) return fallback;
    const hex = formatHex(parsed);
    return hex || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Read --background CSS custom property as hex.
 */
export function getBackgroundColor(fallback = "#0a0a0a"): string {
  if (typeof document === "undefined") return fallback;

  const style = getComputedStyle(document.documentElement);
  const bg = style.getPropertyValue("--background").trim();
  if (!bg) return fallback;

  try {
    const parsed = oklch(bg);
    if (!parsed) return fallback;
    const hex = formatHex(parsed);
    return hex || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Subscribe to theme/accent changes and call the callback with the new
 * primary color hex string whenever it changes.
 */
export function watchPrimaryColor(
  callback: (color: string) => void,
): () => void {
  if (typeof document === "undefined") return () => {};

  const update = () => callback(getPrimaryColor());
  update();

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-accent", "data-theme"],
  });

  return () => observer.disconnect();
}
