import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarX2, ChevronDown } from 'lucide-react';
import { SearchInput } from '@components/ui/SearchInput';
import { cn } from '@lib/utils';
import type { CalendarEvent } from '@lib/events';
import { EventCard } from './EventCard';

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 20;

// ============================================================================
// Date helpers
// ============================================================================

function getEventCategory(startIso: string): 'upcoming' | 'past' {
  const start = new Date(startIso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return startDay.getTime() >= today.getTime() ? 'upcoming' : 'past';
}

function getMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function groupByMonth(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = getMonthKey(event.start);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return groups;
}

function filterEvents(events: CalendarEvent[], query: string): CalendarEvent[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter((e) =>
    e.title.toLowerCase().includes(q) ||
    (e.venue?.toLowerCase() || '').includes(q) ||
    (e.description?.toLowerCase() || '').includes(q)
  );
}

// ============================================================================
// Event List
// ============================================================================

type TabKey = 'upcoming' | 'past' | 'all';

interface EventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function EventList({ events, onEventClick }: EventListProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('upcoming');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);

  // Categorize events
  const categorized = React.useMemo(() => {
    const upcoming: CalendarEvent[] = [];
    const past: CalendarEvent[] = [];
    for (const e of events) {
      if (getEventCategory(e.start) === 'upcoming') {
        upcoming.push(e);
      } else {
        past.push(e);
      }
    }
    // Upcoming: soonest first. Past: most recent first.
    upcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    past.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    return { upcoming, past, all: [...upcoming, ...past] };
  }, [events]);

  // Active pool based on tab
  const pool = React.useMemo(() => {
    const base = categorized[activeTab];
    return filterEvents(base, query);
  }, [categorized, activeTab, query]);

  // Reset page when tab or query changes
  React.useEffect(() => {
    setPage(1);
  }, [activeTab, query]);

  const paginated = React.useMemo(() => pool.slice(0, page * PAGE_SIZE), [pool, page]);
  const hasMore = paginated.length < pool.length;

  const groups = React.useMemo(() => groupByMonth(paginated), [paginated]);
  const monthKeys = React.useMemo(() => Array.from(groups.keys()), [groups]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: categorized.upcoming.length },
    { key: 'past', label: 'Past', count: categorized.past.length },
    { key: 'all', label: 'All', count: events.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header row: tabs + search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/40 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="event-tab-indicator"
                  className="absolute inset-0 bg-background rounded-md shadow-sm border border-border/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.label}
                <span className="text-[10px] tabular-nums opacity-60">{tab.count}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          placeholder="Search events..."
          className="w-full lg:w-72"
        />
      </div>

      {/* Events */}
      <AnimatePresence mode="wait">
        {monthKeys.length > 0 ? (
          <motion.div
            key={activeTab + query}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {monthKeys.map((key) => {
              const monthEvents = groups.get(key)!;
              return (
                <div key={key}>
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {formatMonthLabel(key)}
                    </h3>
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {monthEvents.length}
                    </span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {monthEvents.map((event, i) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        index={i % 6}
                        onClick={onEventClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5',
                    'bg-muted text-sm font-medium text-foreground',
                    'hover:bg-accent transition-colors border border-border/60'
                  )}
                >
                  <ChevronDown size={16} />
                  Load more
                  <span className="text-muted-foreground text-xs">({pool.length - paginated.length} left)</span>
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <CalendarX2 size={22} className="text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No events found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {query
                ? `No events match "${query}". Try a different search term.`
                : 'No events in this category.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
