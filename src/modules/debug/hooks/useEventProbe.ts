import { useEffect, useState, type RefObject } from "react";

interface EventProbeResult {
  eventReceived: boolean;
}

export function useEventProbe(
  ref: RefObject<HTMLElement | null>,
): EventProbeResult {
  const [eventReceived, setEventReceived] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mark = () => {
      setEventReceived(true);
      setTimeout(() => setEventReceived(false), 2000);
    };

    el.addEventListener("pointerdown", mark);
    el.addEventListener("wheel", mark, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", mark);
      el.removeEventListener("wheel", mark);
    };
  }, [ref]);

  return { eventReceived };
}
