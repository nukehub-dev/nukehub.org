import * as React from "react";
import { EventCalendar } from "./EventCalendar";
import { UpcomingHighlight } from "./UpcomingHighlight";
import { EventList } from "./EventList";
import { EventDetailModal } from "./EventDetailModal";
import type { CalendarEvent } from "@modules/events/types";

interface EventsContainerProps {
  events: CalendarEvent[];
}

export function EventsContainer({ events }: EventsContainerProps) {
  const [selectedEvent, setSelectedEvent] =
    React.useState<CalendarEvent | null>(null);

  return (
    <div className="space-y-8">
      {/* Next Up — top 3 upcoming events */}
      <UpcomingHighlight events={events} onEventClick={setSelectedEvent} />

      {/* Calendar — wrapped in bubble glassmorphism card */}
      <div className="bubble rounded-xl border border-border/40 overflow-hidden shadow-sm">
        <EventCalendar events={events} onEventClick={setSelectedEvent} />
      </div>

      {/* Event List — tabbed with pagination */}
      <EventList events={events} onEventClick={setSelectedEvent} />

      {/* Shared detail modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
