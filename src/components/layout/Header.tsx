import * as React from 'react';
import { cn } from '@lib/utils';
import { navItems } from '@data/nav.tsx';
import { Logo } from '@components/ui/Logo';
import { ThemeToggle } from '@components/shared/ThemeToggle';
import { ColorPicker } from '@components/shared/ColorPicker';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground hover:opacity-80 transition-opacity">
          <Logo size={24} className="text-primary" />
          <span>NukeHub</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <div key={item.title} className="relative">
              {item.children ? (
                <>
                  <button
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                    onMouseEnter={() => setOpenDropdown(item.title)}
                    onMouseLeave={() => setOpenDropdown(null)}
                    onClick={() => setOpenDropdown(openDropdown === item.title ? null : item.title)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                    <svg
                      className={cn('h-3 w-3 transition-transform', openDropdown === item.title && 'rotate-180')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === item.title && (
                    <div
                      className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg"
                      onMouseEnter={() => setOpenDropdown(item.title)}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      {item.children.map((child) => (
                        <a
                          key={child.title}
                          href={child.url}
                          target={child.newpage ? '_blank' : undefined}
                          rel={child.newpage ? 'noopener noreferrer' : undefined}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <child.icon className="h-4 w-4 text-muted-foreground" />
                          {child.title}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <a
                  href={item.url}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </a>
              )}
            </div>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Accent picker (desktop) */}
          <div className="hidden sm:flex items-center">
            <ColorPicker />
          </div>

          {/* Theme toggle */}
          <ThemeToggle variant="dropdown" />

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <div key={item.title}>
                {item.children ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-foreground">
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </div>
                    {item.children.map((child) => (
                      <a
                        key={child.title}
                        href={child.url}
                        target={child.newpage ? '_blank' : undefined}
                        rel={child.newpage ? 'noopener noreferrer' : undefined}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ml-6"
                        onClick={() => setMobileOpen(false)}
                      >
                        <child.icon className="h-4 w-4" />
                        {child.title}
                      </a>
                    ))}
                  </div>
                ) : (
                  <a
                    href={item.url}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </a>
                )}
              </div>
            ))}

            {/* Mobile accent picker */}
            <div className="flex items-center gap-2 px-3 pt-3 border-t border-border mt-2">
              <span className="text-xs text-muted-foreground">Accent:</span>
              <ColorPicker showLabels />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
