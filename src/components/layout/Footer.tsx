import { footerColumns } from '@data/footer';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground hover:opacity-80 transition-opacity">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <circle cx="12" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="18.5" cy="9" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="18.5" cy="15" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="5.5" cy="15" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="5.5" cy="9" r="1.5" fill="currentColor" opacity="0.6" />
              </svg>
              <span>NukeHub</span>
            </a>
            <p className="mt-2 text-sm text-muted-foreground">
              Empowering Nuclear Innovation
            </p>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.children.map((child) => (
                  <li key={child.title}>
                    <a
                      href={child.url}
                      target={child.newpage ? '_blank' : undefined}
                      rel={child.newpage ? 'noopener noreferrer' : undefined}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {child.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {year} NukeHub. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="/code-of-conduct" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Code of Conduct
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
