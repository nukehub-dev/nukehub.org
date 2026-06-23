/**
 * ============================================================================
 * Event Types & Recurrence Engine
 * ============================================================================
 *
 * This module provides:
 *   - TypeScript types for events (single + recurring)
 *   - A recurrence engine that expands templates into individual instances
 *   - A helper to load events from Astro content collections and expand them
 *
 * For day-to-day use, you do NOT need to touch this file. Just add YAML files
 * to src/content/events/ and they will be picked up automatically.
 * ============================================================================
 */

// ============================================================================
// Types
// ============================================================================

export interface EventOrganizer {
  name: string;
  email: string;
}

export type RecurrenceType =
  | { type: "monthly-date"; day: number }
  | { type: "monthly-weekday"; weekday: number; occurrence: 1 | 2 | 3 | 4 | -1 }
  | { type: "weekly"; weekday: number }
  | { type: "biweekly"; weekday: number; anchorDate: string };

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  venue?: string;
  organizer?: EventOrganizer[];
  speakers?: EventOrganizer[];
  url?: string;
  meetingUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  recurrence?: RecurrenceType;
}

// ============================================================================
// Recurrence engine
// ============================================================================

const RECUR_START = new Date("2024-10-01T00:00:00Z");
const RECUR_END = new Date("2026-12-31T23:59:59Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function getUTCDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function getNthWeekdayUTC(
  year: number,
  month: number,
  weekday: number,
  occurrence: number,
): Date | null {
  const daysInMonth = getUTCDaysInMonth(year, month);

  if (occurrence > 0) {
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(Date.UTC(year, month, day));
      if (d.getUTCDay() === weekday) {
        count++;
        if (count === occurrence) return d;
      }
    }
  } else {
    for (let day = daysInMonth; day >= 1; day--) {
      const d = new Date(Date.UTC(year, month, day));
      if (d.getUTCDay() === weekday) return d;
    }
  }
  return null;
}

function addMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  let targetMonth = month + months;
  let targetYear = year;
  while (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }
  while (targetMonth > 11) {
    targetMonth -= 12;
    targetYear += 1;
  }

  const maxDay = getUTCDaysInMonth(targetYear, targetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, maxDay)));
}

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function durationMs(start: string, end?: string): number {
  if (!end) return 0;
  return new Date(end).getTime() - new Date(start).getTime();
}

function timeOfDay(iso: string): {
  h: number;
  m: number;
  s: number;
  ms: number;
} {
  const d = new Date(iso);
  return {
    h: d.getUTCHours(),
    m: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
    ms: d.getUTCMilliseconds(),
  };
}

function setDateTimeUTC(
  base: Date,
  tod: { h: number; m: number; s: number; ms: number },
): Date {
  const d = new Date(base);
  d.setUTCHours(tod.h, tod.m, tod.s, tod.ms);
  return d;
}

function generateInstances(event: CalendarEvent): CalendarEvent[] {
  if (!event.recurrence) return [event];

  const instances: CalendarEvent[] = [];
  const recur = event.recurrence;
  const tod = timeOfDay(event.start);
  const dur = durationMs(event.start, event.end);
  let seq = 0;

  switch (recur.type) {
    case "monthly-date": {
      let cursor = new Date(RECUR_START);
      while (cursor <= RECUR_END) {
        const candidate = new Date(
          Date.UTC(
            cursor.getUTCFullYear(),
            cursor.getUTCMonth(),
            recur.day,
            tod.h,
            tod.m,
            tod.s,
            tod.ms,
          ),
        );
        if (candidate.getUTCMonth() === cursor.getUTCMonth()) {
          if (candidate >= RECUR_START && candidate <= RECUR_END) {
            instances.push(makeInstance(event, candidate, dur, seq++));
          }
        }
        cursor = addMonthsUTC(cursor, 1);
      }
      break;
    }

    case "monthly-weekday": {
      let cursor = new Date(RECUR_START);
      while (cursor <= RECUR_END) {
        const candidate = getNthWeekdayUTC(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth(),
          recur.weekday,
          recur.occurrence,
        );
        if (candidate) {
          const start = setDateTimeUTC(candidate, tod);
          if (start >= RECUR_START && start <= RECUR_END) {
            instances.push(makeInstance(event, start, dur, seq++));
          }
        }
        cursor = addMonthsUTC(cursor, 1);
      }
      break;
    }

    case "weekly": {
      let cursor = new Date(RECUR_START);
      while (cursor.getUTCDay() !== recur.weekday) {
        cursor = addDaysUTC(cursor, 1);
      }
      while (cursor <= RECUR_END) {
        const start = setDateTimeUTC(cursor, tod);
        if (start >= RECUR_START && start <= RECUR_END) {
          instances.push(makeInstance(event, start, dur, seq++));
        }
        cursor = addDaysUTC(cursor, 7);
      }
      break;
    }

    case "biweekly": {
      const anchor = new Date(recur.anchorDate + "T00:00:00Z");
      let cursor = new Date(anchor);
      while (cursor < RECUR_START) {
        cursor = addDaysUTC(cursor, 14);
      }
      while (cursor.getUTCDay() !== recur.weekday) {
        cursor = addDaysUTC(cursor, 1);
      }
      while (cursor <= RECUR_END) {
        const start = setDateTimeUTC(cursor, tod);
        if (start >= RECUR_START && start <= RECUR_END) {
          instances.push(makeInstance(event, start, dur, seq++));
        }
        cursor = addDaysUTC(cursor, 14);
      }
      break;
    }
  }

  return instances;
}

function makeInstance(
  base: CalendarEvent,
  start: Date,
  dur: number,
  seq: number,
): CalendarEvent {
  const startIso = start.toISOString();
  const endIso =
    dur > 0 ? new Date(start.getTime() + dur).toISOString() : undefined;
  return {
    ...base,
    id: `${base.id}--${seq}`,
    start: startIso,
    end: endIso,
  };
}

/** Expand all templates (single + recurring) into a flat, chronologically sorted array. */
export function expandEvents(templates: CalendarEvent[]): CalendarEvent[] {
  const all: CalendarEvent[] = [];
  for (const template of templates) {
    all.push(...generateInstances(template));
  }
  return all.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}
