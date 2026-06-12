import {
  footerColumns as defaultFooterColumns,
  footerLegal,
  socialLinks,
  buildFooterColumns,
  type ProjectFooterEntry,
} from "@data/footer";
import { Logo } from "@components/ui/Logo";
import { BrandIcon } from "@components/ui/BrandIcon";
import { CookieSettingsLink } from "@components/shared/CookieSettingsLink";
import { ArrowUpRight } from "lucide-react";

interface FooterProps {
  projectEntries?: ProjectFooterEntry[];
}

export function Footer({ projectEntries }: FooterProps) {
  const year = new Date().getFullYear();
  const columns = projectEntries
    ? buildFooterColumns(projectEntries)
    : defaultFooterColumns;

  return (
    <footer className="relative mt-auto w-full border-t border-border/40 bg-background">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <a
              href="/"
              className="inline-flex items-center gap-2.5 text-xl font-semibold text-foreground transition-opacity hover:opacity-80"
            >
              <Logo size={28} className="text-primary" />
              <span>NukeHub</span>
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Empowering Nuclear Innovation through open-source collaboration,
              education, and community.
            </p>

            {/* Social icons */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20"
                  aria-label={social.name}
                >
                  <BrandIcon name={social.name} size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <li key={link.title}>
                        <a
                          href={link.url}
                          target={link.newpage ? "_blank" : undefined}
                          rel={link.newpage ? "noopener noreferrer" : undefined}
                          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                        >
                          {Icon && (
                            <Icon
                              size={14}
                              className="opacity-60 transition-opacity group-hover:opacity-100"
                            />
                          )}
                          <span className="relative">
                            {link.title}
                            <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                          </span>
                          {link.newpage && (
                            <ArrowUpRight
                              size={12}
                              className="opacity-40 transition-opacity group-hover:opacity-100"
                            />
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            &copy; {year} NukeHub. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {footerLegal.map((link) => (
              <a
                key={link.url}
                href={link.url}
                className="group relative text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.title}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <CookieSettingsLink />
          </nav>
        </div>
      </div>
    </footer>
  );
}
