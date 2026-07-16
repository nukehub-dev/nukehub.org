import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  Mail,
  Link2,
  ArrowUpRight,
  Video,
} from "lucide-react";
import { Badge } from "@components/ui/Badge";
import { cn } from "@lib/utils";
import {
  formatEventDateTime,
  formatEventTimeRange,
  isSameLocalDay,
} from "@modules/events/lib/eventDates";
import type { CalendarEvent } from "@modules/events/types";

// ============================================================================
// Date formatting helper
// ============================================================================

function formatModalTimeRange(start: string, end?: string): string {
  const sameDay = end ? isSameLocalDay(start, end) : false;

  if (sameDay) {
    return formatEventTimeRange(start, end);
  }

  return `${formatEventDateTime(start)}${end ? " – " + formatEventDateTime(end) : ""}`;
}

// ============================================================================
// Event Detail Modal
// ============================================================================

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

// "Mounted" detection without setState-in-effect: false while server-rendering
// and during hydration, true once client-side. The portal into document.body
// must wait for the client.
const noopSubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  React.useEffect(() => {
    if (!mounted || !event) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mounted, event]);

  React.useEffect(() => {
    if (!mounted || !event) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mounted, event, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className={cn(
              "bubble relative w-full max-w-lg overflow-hidden",
              "max-h-[85vh] flex flex-col",
            )}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top color bar */}
            <div
              className="h-1.5 w-full shrink-0"
              style={{
                backgroundColor: event.backgroundColor || "var(--primary)",
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/90 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="overflow-y-auto">
              <div className="px-6 pt-6 pb-6">
                {/* Title & time */}
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.08 }}
                >
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 pr-8">
                    {event.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge
                      variant="default"
                      className="text-[11px]"
                      style={
                        event.backgroundColor
                          ? {
                              backgroundColor: `${event.backgroundColor}20`,
                              color: event.backgroundColor,
                              borderColor: `${event.backgroundColor}40`,
                            }
                          : undefined
                      }
                    >
                      <Calendar size={11} className="mr-1" />
                      Event
                    </Badge>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                    <Clock size={15} className="mt-0.5 shrink-0" />
                    <span>{formatModalTimeRange(event.start, event.end)}</span>
                  </div>

                  {event.venue && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin size={15} className="mt-0.5 shrink-0" />
                      <span>{event.venue}</span>
                    </div>
                  )}
                </motion.div>

                {/* Description */}
                {event.description && (
                  <motion.div
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.12 }}
                    className="mb-5"
                  >
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {event.description}
                    </p>
                  </motion.div>
                )}

                {/* Organizers */}
                {event.organizer && event.organizer.length > 0 && (
                  <motion.div
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.16 }}
                    className="mb-4"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Users size={13} />
                      Organizers
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {event.organizer.map((org) => (
                        <a
                          key={org.email}
                          href={`mailto:${org.email}`}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-muted hover:bg-accent transition-colors border border-border"
                        >
                          <Mail size={11} />
                          {org.name}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Speakers */}
                {event.speakers && event.speakers.length > 0 && (
                  <motion.div
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-5"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Users size={13} />
                      Speakers
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {event.speakers.map((speaker) => (
                        <span
                          key={speaker.email}
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs bg-primary/10 text-primary border border-primary/20"
                        >
                          {speaker.name}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.24 }}
                  className="flex flex-wrap items-center gap-2.5"
                >
                  {event.meetingUrl && (
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2",
                        "bg-primary text-primary-foreground text-sm font-medium",
                        "hover:brightness-110 transition-all shadow-sm",
                      )}
                    >
                      <Video size={15} />
                      Join Meeting
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2",
                        event.meetingUrl
                          ? "bg-muted text-foreground hover:bg-accent border border-border"
                          : "bg-primary text-primary-foreground hover:brightness-110 shadow-sm",
                        "text-sm font-medium transition-all",
                      )}
                    >
                      <Link2 size={15} />
                      Event Page
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                  {event.organizer && event.organizer[0] && (
                    <a
                      href={`mailto:${event.organizer[0].email}?subject=${encodeURIComponent(
                        `Question about: ${event.title}`,
                      )}`}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2",
                        "bg-muted text-foreground text-sm font-medium",
                        "hover:bg-accent transition-colors border border-border",
                      )}
                    >
                      <Mail size={15} />
                      Contact Organizer
                    </a>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
