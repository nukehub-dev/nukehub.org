import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Command,
  ArrowUpRight,
  User,
  Calendar,
  LayoutGrid,
  Globe,
  FileText,
  Atom,
  FlaskConical,
  BarChart3,
  Package,
  Code2,
  Cpu,
  Server,
  Factory,
  Monitor as MonitorIcon,
} from "lucide-react";
import { cn } from "@lib/utils";

export interface CommandPaletteProject {
  id: string;
  title: string;
  description: string;
  url: string;
  iconName?: string;
  tags?: string[];
  category: "Projects";
}

export interface CommandPalettePerson {
  id: string;
  name: string;
  role?: string;
  organization?: string;
  url?: string;
  category: "People";
}

export interface CommandPaletteEvent {
  id: string;
  title: string;
  description?: string;
  url?: string;
  category: "Events";
}

export interface CommandPaletteIntegration {
  id: string;
  name: string;
  description: string;
  url: string;
  categoryName: string;
  category: "Integrations";
}

export interface CommandPalettePage {
  id: string;
  title: string;
  url: string;
  iconName?: string;
  category: "Pages";
}

export type CommandPaletteItem =
  | CommandPaletteProject
  | CommandPalettePerson
  | CommandPaletteEvent
  | CommandPaletteIntegration
  | CommandPalettePage;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: CommandPaletteProject[];
  people: CommandPalettePerson[];
  events: CommandPaletteEvent[];
  integrations: CommandPaletteIntegration[];
  pages: CommandPalettePage[];
}

const categoryOrder = ["Projects", "Pages", "People", "Events", "Integrations"];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Factory,
  BarChart3,
  FlaskConical,
  Package,
  Code2,
  Globe,
  Monitor: MonitorIcon,
  Cpu,
  Server,
  User,
  Calendar,
  LayoutGrid,
  FileText,
  Atom,
};

function getItemIcon(item: CommandPaletteItem) {
  if (item.category === "Projects") {
    const Icon = item.iconName ? iconMap[item.iconName] : null;
    return Icon || LayoutGrid;
  }
  if (item.category === "People") return User;
  if (item.category === "Events") return Calendar;
  if (item.category === "Integrations") return Globe;
  if (item.category === "Pages") {
    const Icon = item.iconName ? iconMap[item.iconName] : null;
    return Icon || FileText;
  }
  return FileText;
}

function getItemTitle(item: CommandPaletteItem) {
  if (item.category === "People") return item.name;
  if (item.category === "Integrations") return item.name;
  return item.title;
}

function getItemSubtitle(item: CommandPaletteItem) {
  if (item.category === "Projects")
    return item.tags?.join(", ") || item.description;
  if (item.category === "People") {
    return [item.role, item.organization].filter(Boolean).join(" · ");
  }
  if (item.category === "Events") return item.description;
  if (item.category === "Integrations") return item.categoryName;
  if (item.category === "Pages") return "";
  return "";
}

function getItemUrl(item: CommandPaletteItem) {
  if (item.category === "People") return item.url || `/people`;
  if (item.category === "Events") return item.url || `/events`;
  return item.url;
}

function scoreItem(item: CommandPaletteItem, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const title = getItemTitle(item).toLowerCase();
  const subtitle = getItemSubtitle(item).toLowerCase();
  const tags =
    item.category === "Projects"
      ? (item.tags || []).join(" ").toLowerCase()
      : "";

  let score = 0;
  if (title.startsWith(q)) score += 100;
  else if (title.includes(q)) score += 50;

  if (subtitle.includes(q)) score += 20;
  if (tags.includes(q)) score += 30;

  return score;
}

function groupItems(
  items: CommandPaletteItem[],
): [string, CommandPaletteItem[]][] {
  const grouped = new Map<string, CommandPaletteItem[]>();
  for (const item of items) {
    const list = grouped.get(item.category) || [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return categoryOrder
    .map((category) => [category, grouped.get(category) || []] as const)
    .filter(([, list]) => list.length > 0);
}

export function CommandPalette({
  isOpen,
  onClose,
  projects,
  people,
  events,
  integrations,
  pages,
}: CommandPaletteProps) {
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  const allItems = React.useMemo(
    () => [...projects, ...pages, ...people, ...events, ...integrations],
    [projects, pages, people, events, integrations],
  );

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 12);
    return allItems
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          getItemTitle(a.item).localeCompare(getItemTitle(b.item)),
      )
      .map(({ item }) => item);
  }, [allItems, query]);

  const groupedResults = React.useMemo(
    () => groupItems(filteredItems),
    [filteredItems],
  );

  // Reset selection when query or open state changes.
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  // Focus input when opened.
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    setQuery("");
  }, [isOpen]);

  // Lock body scroll while open.
  React.useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i < filteredItems.length - 1 ? i + 1 : i));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setSelectedIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSelectedIndex(filteredItems.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) {
          window.location.href = getItemUrl(item);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filteredItems, selectedIndex, onClose],
  );

  // Scroll selected item into view.
  React.useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>(
      "[data-selected='true']",
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh] sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/60"
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Top glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-3/4 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px] opacity-60" />

            {/* Search header */}
            <div className="relative flex items-center gap-3 border-b border-border/60 px-4 py-4 dark:border-white/5">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, people, events, integrations..."
                className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Search"
                aria-autocomplete="list"
                aria-controls="command-palette-results"
              />
              <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans">
                  ESC
                </kbd>
                <span>to close</span>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div
              ref={resultsRef}
              id="command-palette-results"
              role="listbox"
              className="relative max-h-[50vh] overflow-y-auto p-2"
            >
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No results for "{query}"
                  </p>
                </div>
              ) : (
                groupedResults.map(([category, items]) => {
                  const startIndex = filteredItems.findIndex(
                    (i) => i.category === category,
                  );

                  return (
                    <div key={category} className="mb-2">
                      <div className="sticky top-0 z-10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                        {category}
                      </div>
                      <div className="space-y-0.5">
                        {items.map((item) => {
                          const index = startIndex + items.indexOf(item);
                          const selected = index === selectedIndex;
                          const Icon = getItemIcon(item);
                          const url = getItemUrl(item);

                          return (
                            <a
                              key={`${item.category}-${item.id}`}
                              href={url}
                              role="option"
                              aria-selected={selected}
                              data-selected={selected}
                              onClick={onClose}
                              onMouseEnter={() => setSelectedIndex(index)}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                                selected
                                  ? "bg-primary/10 text-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                                  selected
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-border bg-muted text-muted-foreground",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <span className="truncate">
                                    {getItemTitle(item)}
                                  </span>
                                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                                {getItemSubtitle(item) && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {getItemSubtitle(item)}
                                  </p>
                                )}
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-between border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground dark:border-white/5">
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans">
                    ↑
                  </kbd>
                  <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans">
                    ↓
                  </kbd>
                  to navigate
                </span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans">
                    ↵
                  </kbd>
                  to open
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Command className="h-3.5 w-3.5" />
                <span>Command Palette</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
