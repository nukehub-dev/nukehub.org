import { Globe } from "lucide-react";
import { getUserTimezone } from "@modules/events/lib/eventDates";

export function TimezoneNote() {
  const timezone = getUserTimezone();

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
      <Globe size={13} className="shrink-0" />
      <span>
        Event times are shown in your local timezone{" "}
        <span className="font-medium text-foreground">({timezone})</span>
      </span>
    </div>
  );
}
