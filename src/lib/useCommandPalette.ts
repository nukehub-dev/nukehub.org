import { useEffect, useState } from "react";

/**
 * Global keyboard shortcut listener for the command palette.
 * Opens on Cmd+K / Ctrl+K and closes on Escape.
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k" &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }

      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((open) => !open),
  };
}
