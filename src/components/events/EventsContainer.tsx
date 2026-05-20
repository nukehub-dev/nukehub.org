import * as React from 'react';
import { EventCalendar } from './EventCalendar';
import { EventDetailModal } from './EventDetailModal';
import type { CalendarEvent } from '@data/events';

interface EventsContainerProps {
  events: CalendarEvent[];
}

export function EventsContainer({ events }: EventsContainerProps) {
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  return (
    <>
      <EventCalendar events={events} onEventClick={setSelectedEvent} />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
