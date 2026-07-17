"use client";

import { useState, useCallback } from "react";
import { Link, ArrowUp, Search, Command, Plus, Copy } from "lucide-react";
import { navItems } from "@data/nav";
import {
  GlassContextMenu,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSeparator,
} from "./GlassContextMenu";

function getSelectedText(): string {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    const start = active.selectionStart ?? 0;
    const end = active.selectionEnd ?? 0;
    return active.value.slice(start, end).trim();
  }
  return window.getSelection()?.toString().trim() ?? "";
}

export function GlobalContextMenu() {
  const [selection, setSelection] = useState("");

  const handleContextMenu = useCallback(() => {
    setSelection(getSelectedText());
  }, []);

  const handleCopySelection = async () => {
    if (!selection) return;
    await navigator.clipboard.writeText(selection);
  };

  return (
    <GlassContextMenu title="Navigation" onContextMenu={handleContextMenu}>
      {/* Quick actions */}
      <ContextMenuItem
        icon={Search}
        onClick={() =>
          window.dispatchEvent(new CustomEvent("command-palette:open"))
        }
        shortcut={
          <span className="flex items-center gap-0.5 leading-none">
            <Command className="h-3 w-3" />
            <Plus className="h-3 w-3" />
            <span className="leading-none">K</span>
          </span>
        }
      >
        Search
      </ContextMenuItem>
      {selection && (
        <ContextMenuItem icon={Copy} onClick={handleCopySelection}>
          Copy selection
        </ContextMenuItem>
      )}
      <ContextMenuItem
        icon={Link}
        onClick={() => navigator.clipboard.writeText(window.location.href)}
      >
        Copy link
      </ContextMenuItem>
      <ContextMenuItem
        icon={ArrowUp}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        shortcut="Home"
      >
        Back to top
      </ContextMenuItem>
      <ContextMenuSeparator />

      {/* Flat top-level links */}
      {navItems
        .filter((item) => !item.children)
        .map((item) => (
          <ContextMenuItem key={item.title} icon={item.icon} href={item.url}>
            {item.title}
          </ContextMenuItem>
        ))}

      {/* Sections with submenus */}
      {navItems
        .filter((item) => item.children)
        .map((item) => (
          <ContextMenuSub key={item.title} label={item.title} icon={item.icon}>
            {item.children!.map((child) => (
              <ContextMenuItem
                key={child.title}
                icon={child.icon}
                href={child.url}
                target={child.newpage ? "_blank" : undefined}
                rel={child.newpage ? "noopener noreferrer" : undefined}
              >
                {child.title}
              </ContextMenuItem>
            ))}
          </ContextMenuSub>
        ))}
    </GlassContextMenu>
  );
}
