import * as React from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Trap focus inside a container while it is active.
 *
 * @param active - whether the focus trap is currently active
 * @returns ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = React.useRef<T>(null);
  const previouslyFocusedRef = React.useRef<Element | null>(null);

  React.useEffect(() => {
    if (!active) return;

    previouslyFocusedRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus the first focusable element when the trap activates.
    const timer = setTimeout(() => first?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus when the trap is deactivated.
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}
