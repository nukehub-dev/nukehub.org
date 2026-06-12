import { useEffect } from "react";
import { useCommandPalette } from "@lib/useCommandPalette";
import {
  CommandPalette,
  type CommandPaletteProject,
  type CommandPalettePerson,
  type CommandPaletteEvent,
  type CommandPaletteIntegration,
  type CommandPalettePage,
} from "./CommandPalette";

interface CommandPaletteManagerProps {
  projects: CommandPaletteProject[];
  people: CommandPalettePerson[];
  events: CommandPaletteEvent[];
  integrations: CommandPaletteIntegration[];
  pages: CommandPalettePage[];
}

export function CommandPaletteManager(props: CommandPaletteManagerProps) {
  const { isOpen, open, close } = useCommandPalette();

  useEffect(() => {
    const handleOpen = () => open();
    window.addEventListener("command-palette:open", handleOpen);
    return () => window.removeEventListener("command-palette:open", handleOpen);
  }, [open]);

  return <CommandPalette isOpen={isOpen} onClose={close} {...props} />;
}
