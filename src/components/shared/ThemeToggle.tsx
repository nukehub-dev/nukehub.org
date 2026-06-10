import * as React from "react";
import { cn } from "@lib/utils";
import {
    getThemePreference,
    getResolvedTheme,
    setThemePreference,
    cycleTheme,
    watchSystemTheme,
    type ThemePreference,
    type ResolvedTheme,
    resolveTheme,
} from "@lib/theme";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Tooltip } from "@components/ui/Tooltip";

const options: {
    value: ThemePreference;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
];

function getIcon(preference: ThemePreference) {
    if (preference === "system") return Monitor;
    return preference === "dark" ? Moon : Sun;
}

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
    const [preference, setPreferenceState] =
        React.useState<ThemePreference>("system");
    const [resolved, setResolved] = React.useState<ResolvedTheme>("light");
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    // Initialise from DOM / localStorage on mount
    React.useEffect(() => {
        const pref = getThemePreference();
        setPreferenceState(pref);
        setResolved(resolveTheme(pref));
    }, []);

    // Sync across browser tabs
    React.useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === "theme") {
                const pref = getThemePreference();
                setPreferenceState(pref);
                setResolved(resolveTheme(pref));
            }
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    // Listen for system theme changes when preference is 'system'
    React.useEffect(() => {
        if (preference !== "system") return;
        return watchSystemTheme(() => {
            // Re-apply system preference to update resolved theme, data-theme, and meta
            setThemePreference("system");
            setResolved(getResolvedTheme());
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
        setPreferenceState(pref);
        setResolved(resolveTheme(pref));
        setThemePreference(pref);
        setOpen(false);
    };

    const handleCycle = () => {
        const next = cycleTheme(preference);
        apply(next);
    };

    const Icon = getIcon(preference);
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
                    <Icon className="h-4 w-4" />
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
                <Icon className="h-4 w-4" />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-1.5 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg z-50"
                    role="menu"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
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
                                <span className="flex-1 text-left">
                                    {opt.label}
                                </span>
                                {active && <Check className="h-3.5 w-3.5" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
