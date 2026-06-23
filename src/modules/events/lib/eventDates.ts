const TIME_FMT_NO_TZ: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

const DATE_FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

const MONTH_FMT: Intl.DateTimeFormatOptions = {
  month: "short",
};

/**
 * Get the user's local IANA timezone name (e.g. "America/New_York").
 * Falls back to UTC if unavailable.
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Return a short timezone abbreviation for a given instant,
 * e.g. "GMT+6", "EDT", "MSK".
 */
export function getTimezoneAbbreviation(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
    timeZone: getUserTimezone(),
  }).formatToParts(d);
  return parts.find((p) => p.type === "timeZoneName")?.value || "";
}

/**
 * Format a time range with timezone abbreviation.
 * Example: "9:00 PM – 10:00 PM GMT+6"
 */
export function formatEventTimeRange(
  startIso: string,
  endIso?: string,
): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const tz = getTimezoneAbbreviation(startIso);

  const sameDay =
    end &&
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(start) ===
      new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).format(end);

  if (end && sameDay) {
    const startStr = start.toLocaleTimeString("en-US", TIME_FMT_NO_TZ);
    const endStr = end.toLocaleTimeString("en-US", TIME_FMT_NO_TZ);
    return `${startStr} – ${endStr}${tz ? ` ${tz}` : ""}`;
  }

  if (end) {
    return `${start.toLocaleDateString("en-US", DATE_FMT)}, ${start.toLocaleTimeString("en-US", TIME_FMT_NO_TZ)} – ${end.toLocaleDateString("en-US", DATE_FMT)}, ${end.toLocaleTimeString("en-US", TIME_FMT_NO_TZ)}${tz ? ` ${tz}` : ""}`;
  }

  return `${start.toLocaleDateString("en-US", DATE_FMT)}${tz ? ` ${tz}` : ""}`;
}

/**
 * Format a full date + time string.
 * Example: "Fri, Jun 19, 2026, 9:00 PM GMT+6"
 */
export function formatEventDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Format just the date.
 * Example: "Fri, Jun 19"
 */
export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", DATE_FMT);
}

/**
 * Format just the time.
 * Example: "9:00 PM"
 */
export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", TIME_FMT_NO_TZ);
}

/**
 * Get the day number for the date block.
 */
export function formatEventDay(iso: string): string {
  return new Date(iso).getDate().toString();
}

/**
 * Get the month abbreviation for the date block.
 */
export function formatEventMonth(iso: string): string {
  return new Date(iso).toLocaleString("en-US", MONTH_FMT).toUpperCase();
}

/**
 * Categorize an event as today, upcoming, or past based on the user's local date.
 */
export function getEventStatus(
  startIso: string,
): "today" | "upcoming" | "past" {
  const start = new Date(startIso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );

  if (startDay.getTime() === today.getTime()) return "today";
  if (start > now) return "upcoming";
  return "past";
}

/**
 * Categorize an event as upcoming or past based on the user's local date.
 */
export function getEventCategory(startIso: string): "upcoming" | "past" {
  return getEventStatus(startIso) === "past" ? "past" : "upcoming";
}

/**
 * Get a month grouping key in the user's local timezone.
 */
export function getEventMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Format a month grouping key for display.
 */
export function formatEventMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/**
 * Check if two ISO timestamps fall on the same local calendar day.
 */
export function isSameLocalDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
