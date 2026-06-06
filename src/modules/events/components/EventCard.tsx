import * as React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import { Badge } from '@components/ui/Badge';
import { cn } from '@lib/utils';
import type { CalendarEvent } from '@modules/events/types';

// ============================================================================
// Date helpers
// ============================================================================

function getEventStatus(startIso: string): 'today' | 'upcoming' | 'past' {
  const start = new Date(startIso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  if (startDay.getTime() === today.getTime()) return 'today';
  if (start > now) return 'upcoming';
  return 'past';
}

function formatDay(iso: string): string {
  return new Date(iso).getDate().toString();
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

function formatTimeRange(startIso: string, endIso?: string): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;

  const sameDay =
    end &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

  if (sameDay) {
    return `${start.toLocaleTimeString('en-US', timeFmt)} – ${end.toLocaleTimeString('en-US', timeFmt)}`;
  }

  const dateFmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (end) {
    return `${start.toLocaleDateString('en-US', dateFmt)} – ${end.toLocaleDateString('en-US', dateFmt)}`;
  }
  return start.toLocaleDateString('en-US', { ...dateFmt, year: 'numeric' });
}

// ============================================================================
// Event Card
// ============================================================================

interface EventCardProps {
  event: CalendarEvent;
  index?: number;
  onClick: (event: CalendarEvent) => void;
}

export function EventCard({ event, index = 0, onClick }: EventCardProps) {
  const status = getEventStatus(event.start);

  const statusConfig = {
    today: { label: 'Today', variant: 'default' as const },
    upcoming: { label: 'Upcoming', variant: 'secondary' as const },
    past: { label: 'Past', variant: 'ghost' as const },
  };

  const { label, variant } = statusConfig[status];
  const accentColor = event.backgroundColor || 'var(--primary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group cursor-pointer h-full"
      onClick={() => onClick(event)}
    >
      <div
        className={cn(
          'bubble relative flex items-stretch rounded-xl border border-border/40 overflow-hidden',
          'shadow-sm transition-shadow duration-200',
          'group-hover:shadow-md h-full'
        )}
      >
        {/* Color accent strip */}
        <div
          className="w-1.5 shrink-0"
          style={{ backgroundColor: accentColor }}
        />

        {/* Date block */}
        <div className="flex flex-col items-center justify-center px-4 py-4 sm:px-5 sm:py-5 min-w-[72px] sm:min-w-[84px] border-r border-border/30 bg-muted/30">
          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wider">
            {formatMonth(event.start)}
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-foreground leading-none mt-0.5">
            {formatDay(event.start)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 px-4 py-3 sm:px-5 sm:py-4 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm sm:text-base leading-tight truncate pr-1">
              {event.title}
            </h3>
            <Badge variant={variant} className="shrink-0 text-[10px] sm:text-xs whitespace-nowrap">
              {label}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Clock size={12} className="shrink-0" />
            <span className="truncate">{formatTimeRange(event.start, event.end)}</span>
          </div>

          {event.venue && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
