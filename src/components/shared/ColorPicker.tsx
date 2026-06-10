import * as React from "react";
import { cn } from "@lib/utils";
import {
  getAccentColor,
  setAccentColor,
  ACCENT_SWATCHES,
  type AccentColor,
} from "@lib/theme";
import { Tooltip } from "@components/ui/Tooltip";

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
  const [accent, setAccentState] = React.useState<AccentColor>("orange");

  // Initialise from DOM / localStorage on mount
  React.useEffect(() => {
    setAccentState(getAccentColor());
  }, []);

  // Sync across browser tabs
  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "accent") {
        setAccentState(getAccentColor());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleSelect = (color: AccentColor) => {
    setAccentState(color);
    setAccentColor(color);
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
