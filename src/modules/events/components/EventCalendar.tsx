import * as React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  CalendarApi,
  DayCellContentArg,
  EventContentArg,
} from "@fullcalendar/core";
import { cn } from "@lib/utils";
import { Tooltip } from "@components/ui/Tooltip";
import type { CalendarEvent } from "@modules/events/types";

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
// Custom event render — replaces native browser tooltip with our Tooltip
// ============================================================================

function EventContent({ info }: { info: EventContentArg }) {
  const event = info.event;
  const timeText = info.timeText;
  const isList =
    info.view.type === "listMonth" || info.view.type.startsWith("list");

  if (isList) return null;

  const venue = event.extendedProps.venue as string | undefined;
  const tooltipContent = (
    <div className="max-w-[200px]">
      <div className="font-semibold mb-0.5">{event.title}</div>
      {timeText && <div className="text-[11px] opacity-80">{timeText}</div>}
      {venue && <div className="text-[11px] opacity-70 mt-0.5">{venue}</div>}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top" delay={200}>
      <div
        className={cn(
          "fc-event-main-frame w-full overflow-hidden",
          info.isMirror && "opacity-50",
        )}
      >
        {info.isStart && (
          <div className="fc-event-time text-[10px] font-medium opacity-90 truncate">
            {timeText}
          </div>
        )}
        <div className="fc-event-title text-[11px] font-medium truncate leading-tight">
          {info.isStart ? event.title : ""}
        </div>
      </div>
    </Tooltip>
  );
}

// ============================================================================
// Custom day cell content — replaces native "Go to ..." tooltip with ours
// ============================================================================

function DayCellContent({ info }: { info: DayCellContentArg }) {
  const label = info.date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Tooltip content={`Go to ${label}`} position="top" delay={150}>
      <span className="fc-daygrid-day-number">{info.dayNumberText}</span>
    </Tooltip>
  );
}

// ============================================================================
// Event Calendar
// ============================================================================

interface EventCalendarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const calendarRef = React.useRef<FullCalendar>(null);
  const [isDark, setIsDark] = React.useState(false);

  // Sync dark mode
  React.useEffect(() => {
    const html = document.documentElement;
    const checkTheme = () => {
      setIsDark(html.getAttribute("data-theme") === "dark");
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const fcEvents = React.useMemo(() => events.map(convertEvent), [events]);

  return (
    <div className={cn(isDark ? "fc-dark" : "")}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
        }}
        events={fcEvents}
        eventContent={(info) => <EventContent info={info} />}
        dayCellContent={(info) => <DayCellContent info={info} />}
        eventClick={(info) => {
          const original = events.find((e) => e.id === info.event.id);
          if (original) {
            info.jsEvent.preventDefault();
            onEventClick(original);
          }
        }}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        height="auto"
        dayMaxEvents={3}
        moreLinkClick="day"
        dateClick={(info) => {
          const api: CalendarApi | null = calendarRef.current?.getApi() ?? null;
          if (api) {
            api.changeView("timeGridDay", info.date);
          }
        }}
        selectable={false}
        editable={false}
        locale="en"
        firstDay={1}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
          list: "List",
        }}
      />
    </div>
  );
}
