'use client';

import React from 'react';
import { Link, ArrowUp } from 'lucide-react';
import { navItems } from '@data/nav';
import {
  GlassContextMenu,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSeparator,
} from './GlassContextMenu';

export function GlobalContextMenu() {
  return (
    <GlassContextMenu title="Navigation">
      {/* Quick actions */}
      <ContextMenuItem
        icon={Link}
        onClick={() => navigator.clipboard.writeText(window.location.href)}
      >
        Copy link
      </ContextMenuItem>
      <ContextMenuItem
        icon={ArrowUp}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
                target={child.newpage ? '_blank' : undefined}
                rel={child.newpage ? 'noopener noreferrer' : undefined}
              >
                {child.title}
              </ContextMenuItem>
            ))}
          </ContextMenuSub>
        ))}
    </GlassContextMenu>
  );
}
