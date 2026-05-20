import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarEvent } from '@data/events';

// ============================================================================
// Event conversion
// ============================================================================

function convertEvent(event: CalendarEvent) {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end || event.start,
    backgroundColor: event.backgroundColor,
    textColor: event.textColor,
    borderColor: event.backgroundColor,
    extendedProps: {
      description: event.description,
      venue: event.venue,
      organizer: event.organizer,
      speakers: event.speakers,
      url: event.url,
    },
  };
}

// ============================================================================
// Event Calendar
// ============================================================================

interface EventCalendarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const [isDark, setIsDark] = React.useState(false);

  // Sync dark mode with our theme system
  React.useEffect(() => {
    const html = document.documentElement;
    const checkTheme = () => {
      setIsDark(html.getAttribute('data-theme') === 'dark');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const fcEvents = React.useMemo(() => events.map(convertEvent), [events]);

  return (
    <div className={isDark ? 'fc-dark' : ''}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
        }}
        events={fcEvents}
        eventClick={(info) => {
          const original = events.find((e) => e.id === info.event.id);
          if (original) {
            info.jsEvent.preventDefault();
            onEventClick(original);
          }
        }}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        height="auto"
        dayMaxEvents={3}
        moreLinkClick="day"
        navLinks={false}
        selectable={false}
        editable={false}
        locale="en"
        firstDay={1}
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          list: 'List',
        }}
      />
    </div>
  );
}
