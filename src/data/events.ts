export interface EventOrganizer {
  name: string;
  email: string;
}

export interface CalendarEvent {
  title: string;
  description?: string;
  start: string; // ISO 8601
  end?: string; // ISO 8601
  venue?: string;
  organizer?: EventOrganizer[];
  speakers?: EventOrganizer[];
  url?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const events: CalendarEvent[] = [
  // Add events here. Example:
  // {
  //   title: 'NukeHub Summit 2024',
  //   description: 'Annual gathering of nuclear technology enthusiasts.',
  //   start: '2024-06-15T09:00:00Z',
  //   end: '2024-06-15T17:00:00Z',
  //   venue: 'Virtual Event',
  //   url: 'https://nukehub.org/events/summit-2024',
  //   backgroundColor: '#f37524',
  //   textColor: '#ffffff',
  // },
];
