import * as React from "react";
import { cn } from "@lib/utils";
import {
  getAccentColor,
  setAccentColor,
  ACCENT_SWATCHES,
  type AccentColor,
} from "@lib/theme";
import { Tooltip } from "@components/ui/Tooltip";

/* Same-tab change notification; `storage` events only fire across tabs */
const ACCENT_CHANGE_EVENT = "accent-change";

function subscribeAccent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ACCENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ACCENT_CHANGE_EVENT, callback);
  };
}

export interface ColorPickerProps {
  className?: string;
  showLabels?: boolean;
}

/**
 * ColorPicker — allows users to pick an accent hue.
 * Updates the CSS custom property --hue-accent indirectly via data-accent
 * and persists the choice in localStorage.
 */
export function ColorPicker({
  className,
  showLabels = false,
}: ColorPickerProps) {
  // Server snapshot matches the SSR default; the stored value is picked up
  // after hydration.
  const accent = React.useSyncExternalStore<AccentColor>(
    subscribeAccent,
    getAccentColor,
    () => "orange",
  );

  const handleSelect = (color: AccentColor) => {
    setAccentColor(color);
    window.dispatchEvent(new Event(ACCENT_CHANGE_EVENT));
  };

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="radiogroup"
      aria-label="Accent color"
    >
      {ACCENT_SWATCHES.map((swatch) => {
        const active = accent === swatch.name;
        return (
          <Tooltip key={swatch.name} content={swatch.label}>
            <button
              role="radio"
              aria-checked={active}
              aria-label={swatch.label}
              onClick={() => handleSelect(swatch.name)}
              className={cn(
                "relative h-5 w-5 rounded-full border-2 transition-transform",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                active ? "border-foreground" : "border-transparent",
              )}
              style={{ background: `oklch(65% 0.18 ${swatch.hue})` }}
            >
              {active && (
                <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/40" />
              )}
            </button>
          </Tooltip>
        );
      })}
      {showLabels && (
        <span className="ml-1 text-xs text-muted-foreground capitalize">
          {accent}
        </span>
      )}
    </div>
  );
}
