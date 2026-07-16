import * as React from "react";
import { cn } from "@lib/utils";
import {
  getThemePreference,
  getResolvedTheme,
  setThemePreference,
  cycleTheme,
  watchSystemTheme,
  getAccentColor,
  setAccentColor,
  ACCENT_SWATCHES,
  type ThemePreference,
  type ResolvedTheme,
  type AccentColor,
} from "@lib/theme";
import { Sun, Moon, Monitor, Check, Palette } from "lucide-react";
import { Tooltip } from "@components/ui/Tooltip";

/* Same-tab change notifications; `storage` events only fire across tabs */
const THEME_CHANGE_EVENT = "theme-change";
const ACCENT_CHANGE_EVENT = "accent-change";

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function subscribeResolved(callback: () => void) {
  const unsubscribeTheme = subscribeTheme(callback);
  const unsubscribeSystem = watchSystemTheme(callback);
  return () => {
    unsubscribeTheme();
    unsubscribeSystem();
  };
}

function subscribeAccent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ACCENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ACCENT_CHANGE_EVENT, callback);
  };
}

const options: {
  value: ThemePreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export interface ThemeToggleProps {
  className?: string;
  variant?: "dropdown" | "cycle";
}

/**
 * ThemeToggle — allows users to switch between light, dark, and system themes.
 *
 * variant="dropdown" (default): opens a menu with three explicit choices.
 * variant="cycle": each click cycles light → dark → system.
 */
export function ThemeToggle({
  className,
  variant = "dropdown",
}: ThemeToggleProps) {
  // Server snapshots match the SSR defaults; the real stored values are
  // picked up after hydration.
  const preference = React.useSyncExternalStore<ThemePreference>(
    subscribeTheme,
    getThemePreference,
    () => "system",
  );
  const resolved = React.useSyncExternalStore<ResolvedTheme>(
    subscribeResolved,
    getResolvedTheme,
    () => "light",
  );
  const accent = React.useSyncExternalStore<AccentColor>(
    subscribeAccent,
    getAccentColor,
    () => "orange",
  );
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Listen for system theme changes when preference is 'system'
  React.useEffect(() => {
    if (preference !== "system") return;
    return watchSystemTheme(() => {
      // Re-apply system preference to update data-theme and meta
      setThemePreference("system");
    });
  }, [preference]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const apply = (pref: ThemePreference) => {
    setThemePreference(pref);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    setOpen(false);
  };

  const applyAccent = (color: AccentColor) => {
    setAccentColor(color);
    window.dispatchEvent(new Event(ACCENT_CHANGE_EVENT));
  };

  const handleCycle = () => {
    const next = cycleTheme(preference);
    apply(next);
  };

  const icon =
    preference === "system" ? (
      <Monitor className="h-4 w-4" />
    ) : preference === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );
  const resolvedLabel =
    preference === "system"
      ? `System (${resolved})`
      : options.find((o) => o.value === preference)?.label;

  if (variant === "cycle") {
    return (
      <Tooltip content={`Theme: ${resolvedLabel}`}>
        <button
          onClick={handleCycle}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            className,
          )}
          aria-label={`Theme: ${resolvedLabel}. Click to cycle.`}
        >
          {icon}
        </button>
      </Tooltip>
    );
  }

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          open && "bg-accent text-accent-foreground",
        )}
        aria-label={`Current theme: ${resolvedLabel}. Open theme menu.`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {icon}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-border bg-popover p-2 shadow-lg z-50"
          role="menu"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Theme
          </div>
          {options.map((opt) => {
            const OptIcon = opt.icon;
            const active = preference === opt.value;
            return (
              <button
                key={opt.value}
                role="menuitem"
                onClick={() => apply(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-accent/50 hover:text-accent-foreground",
                )}
              >
                <OptIcon className="h-4 w-4" />
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}

          <div className="my-1.5 h-px bg-border" />

          <div className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Accent
          </div>
          <div
            className="flex items-center justify-between px-1"
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
                    onClick={() => applyAccent(swatch.name)}
                    className={cn(
                      "relative h-6 w-6 rounded-full border-2 transition-transform",
                      "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-popover",
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
          </div>
        </div>
      )}
    </div>
  );
}
