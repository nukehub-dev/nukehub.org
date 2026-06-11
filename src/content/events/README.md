# Events

Add event YAML files to this directory. One file per event. The filename
becomes the event ID (e.g. `summit-2026.yml` → id `summit-2026`).

## Single event example

Create a file like `my-event.yml`:

```yaml
title: "My Event Title"
description: "A short description shown in the detail modal."
start: "2026-06-15T09:00:00Z"
end: "2026-06-15T17:00:00Z"
venue: "Virtual — Zoom"
meetingUrl: "https://zoom.us/j/123456789"
url: "https://nukehub.org/events/my-event"
backgroundColor: "#e05206"
organizer:
  - name: "Organizer Name"
    email: "email@nukehub.org"
speakers:
  - name: "Speaker Name"
    email: "email@nukehub.org"
```

## Recurring event example

Create a file like `weekly-meeting.yml`:

```yaml
title: "Weekly Team Meeting"
description: "Regular sync for the core team."
start: "2025-01-06T14:00:00Z"
end: "2025-01-06T15:00:00Z"
venue: "Virtual — Discord"
meetingUrl: "https://discord.gg/nukehub"
backgroundColor: "#0d6efd"
organizer:
  - name: "Team Lead"
    email: "admin@nukehub.org"
recurrence:
  type: weekly
  weekday: 1
```

## Recurrence patterns

### Monthly — specific date

```yaml
recurrence:
  type: monthly-date
  day: 28 # 28th of every month
```

### Monthly — Nth weekday

```yaml
recurrence:
  type: monthly-weekday
  weekday: 3 # Wednesday (0=Sun, 1=Mon, ..., 6=Sat)
  occurrence: 2 # 2nd Wednesday. Use -1 for "last"
```

### Weekly

```yaml
recurrence:
  type: weekly
  weekday: 5 # Every Friday
```

### Biweekly

```yaml
recurrence:
  type: biweekly
  weekday: 2 # Tuesday
  anchorDate: "2025-01-14" # First occurrence date
```

## Field reference

| Field             | Required | Description                                                 |
| ----------------- | -------- | ----------------------------------------------------------- |
| `title`           | ✅       | Event title                                                 |
| `start`           | ✅       | Start date/time in ISO 8601 (e.g. `2025-06-15T09:00:00Z`)   |
| `end`             |          | End date/time in ISO 8601                                   |
| `description`     |          | Long description shown in modal                             |
| `venue`           |          | Location or platform name                                   |
| `meetingUrl`      |          | Direct Zoom/Meet/Discord link (shows "Join Meeting" button) |
| `url`             |          | Event info / registration page                              |
| `backgroundColor` |          | Hex color for calendar dot and card accent                  |
| `organizer`       |          | Array of `{ name, email }` — shown as contact links         |
| `speakers`        |          | Array of `{ name, email }` — shown as tags                  |
| `recurrence`      |          | Recurrence pattern (see examples above)                     |
