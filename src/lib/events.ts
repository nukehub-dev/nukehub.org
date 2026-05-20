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
  | { type: 'monthly-date'; day: number }
  | { type: 'monthly-weekday'; weekday: number; occurrence: 1 | 2 | 3 | 4 | -1 }
  | { type: 'weekly'; weekday: number }
  | { type: 'biweekly'; weekday: number; anchorDate: string };

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

const RECUR_START = new Date('2024-10-01T00:00:00Z');
const RECUR_END = new Date('2026-12-31T23:59:59Z');

function getNthWeekday(
  year: number,
  month: number,
  weekday: number,
  occurrence: number
): Date | null {
  if (occurrence > 0) {
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const d = new Date(year, month, day);
      if (d.getMonth() !== month) break;
      if (d.getDay() === weekday) {
        count++;
        if (count === occurrence) return d;
      }
    }
  } else {
    const lastDay = new Date(year, month + 1, 0);
    for (let day = lastDay.getDate(); day >= 1; day--) {
      const d = new Date(year, month, day);
      if (d.getDay() === weekday) return d;
    }
  }
  return null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function durationMs(start: string, end?: string): number {
  if (!end) return 0;
  return new Date(end).getTime() - new Date(start).getTime();
}

function timeOfDay(iso: string): { h: number; m: number; s: number; ms: number } {
  const d = new Date(iso);
  return {
    h: d.getUTCHours(),
    m: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
    ms: d.getUTCMilliseconds(),
  };
}

function setDateTime(base: Date, tod: { h: number; m: number; s: number; ms: number }): Date {
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
    case 'monthly-date': {
      let cursor = new Date(RECUR_START);
      while (cursor <= RECUR_END) {
        const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), recur.day);
        if (candidate.getMonth() === cursor.getMonth()) {
          const start = setDateTime(candidate, tod);
          if (start >= RECUR_START && start <= RECUR_END) {
            instances.push(makeInstance(event, start, dur, seq++));
          }
        }
        cursor = addMonths(cursor, 1);
      }
      break;
    }

    case 'monthly-weekday': {
      let cursor = new Date(RECUR_START);
      while (cursor <= RECUR_END) {
        const candidate = getNthWeekday(
          cursor.getFullYear(),
          cursor.getMonth(),
          recur.weekday,
          recur.occurrence
        );
        if (candidate) {
          const start = setDateTime(candidate, tod);
          if (start >= RECUR_START && start <= RECUR_END) {
            instances.push(makeInstance(event, start, dur, seq++));
          }
        }
        cursor = addMonths(cursor, 1);
      }
      break;
    }

    case 'weekly': {
      let cursor = new Date(RECUR_START);
      while (cursor.getDay() !== recur.weekday) {
        cursor = addDays(cursor, 1);
      }
      while (cursor <= RECUR_END) {
        const start = setDateTime(cursor, tod);
        if (start >= RECUR_START && start <= RECUR_END) {
          instances.push(makeInstance(event, start, dur, seq++));
        }
        cursor = addDays(cursor, 7);
      }
      break;
    }

    case 'biweekly': {
      const anchor = new Date(recur.anchorDate + 'T00:00:00Z');
      let cursor = new Date(anchor);
      while (cursor < RECUR_START) {
        cursor = addDays(cursor, 14);
      }
      while (cursor.getDay() !== recur.weekday) {
        cursor = addDays(cursor, 1);
      }
      while (cursor <= RECUR_END) {
        const start = setDateTime(cursor, tod);
        if (start >= RECUR_START && start <= RECUR_END) {
          instances.push(makeInstance(event, start, dur, seq++));
        }
        cursor = addDays(cursor, 14);
      }
      break;
    }
  }

  return instances;
}

function makeInstance(base: CalendarEvent, start: Date, dur: number, seq: number): CalendarEvent {
  const startIso = start.toISOString();
  const endIso = dur > 0 ? new Date(start.getTime() + dur).toISOString() : undefined;
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
  return all.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
