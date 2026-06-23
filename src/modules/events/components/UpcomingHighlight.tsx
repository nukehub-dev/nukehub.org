import * as React from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Calendar } from "lucide-react";
import { Card } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import {
  formatEventDate,
  formatEventTime,
  getEventCategory,
} from "@modules/events/lib/eventDates";
import type { CalendarEvent } from "@modules/events/types";

// ============================================================================
// Upcoming Highlight
// ============================================================================

interface UpcomingHighlightProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function UpcomingHighlight({
  events,
  onEventClick,
}: UpcomingHighlightProps) {
  const upcoming = React.useMemo(() => {
    return events
      .filter((e) => getEventCategory(e.start) === "upcoming")
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  }, [events]);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Next Up</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {upcoming.map((event, i) => {
          const accentColor = event.backgroundColor || "var(--primary)";

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: i * 0.08,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Card
                variant="bubble"
                interactive
                className="group cursor-pointer h-full overflow-hidden"
                onClick={() => onEventClick(event)}
              >
                {/* Top accent bar */}
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: accentColor }}
                />

                <div className="p-4 sm:p-5 flex flex-col h-full">
                  {/* Date badge */}
                  <Badge
                    variant="default"
                    className="w-fit text-[11px] mb-2.5"
                    style={
                      event.backgroundColor
                        ? {
                            backgroundColor: `${event.backgroundColor}18`,
                            color: event.backgroundColor,
                            borderColor: `${event.backgroundColor}35`,
                          }
                        : undefined
                    }
                  >
                    {formatEventDate(event.start)} ·{" "}
                    {formatEventTime(event.start)}
                  </Badge>

                  {/* Title */}
                  <h3 className="font-semibold text-sm sm:text-base leading-tight mb-1.5 line-clamp-2">
                    {event.title}
                  </h3>

                  {/* Venue */}
                  {event.venue && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={11} />
                      <span className="truncate">{event.venue}</span>
                    </p>
                  )}

                  {/* CTA — appears on hover */}
                  <div className="mt-auto pt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View details
                    <ArrowRight size={12} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
