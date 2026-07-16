"use client";

import React from "react";
import { cn } from "@lib/utils";
import { X, ShieldCheck } from "lucide-react";

type ConsentValue = "granted" | "denied" | null;

const CONSENT_KEY = "cookie-consent";

function readStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CONSENT_KEY) as ConsentValue;
  return stored === "granted" || stored === "denied" ? stored : null;
}

function subscribe(callback: () => void) {
  window.addEventListener("cookie-consent-change", callback);
  return () => window.removeEventListener("cookie-consent-change", callback);
}

export function useCookieConsent() {
  const consent = React.useSyncExternalStore(
    subscribe,
    readStoredConsent,
    () => null,
  );
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const grant = React.useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "granted");
    window.dispatchEvent(
      new CustomEvent("cookie-consent-change", {
        detail: { consent: "granted" },
      }),
    );
  }, []);

  const deny = React.useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "denied");
    window.dispatchEvent(
      new CustomEvent("cookie-consent-change", {
        detail: { consent: "denied" },
      }),
    );
  }, []);

  return { consent, grant, deny, mounted };
}

export function CookieConsent() {
  const { consent, grant, deny, mounted } = useCookieConsent();
  const [showAfterDelay, setShowAfterDelay] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  // Adjust state during render: re-arm the banner when consent is cleared and
  // reset the reveal delay once a choice is stored.
  const [prevConsent, setPrevConsent] = React.useState(consent);
  if (prevConsent !== consent) {
    setPrevConsent(consent);
    if (consent === null) {
      setDismissed(false);
    } else {
      setShowAfterDelay(false);
    }
  }

  React.useEffect(() => {
    if (!mounted || consent !== null) return;
    const timer = setTimeout(() => setShowAfterDelay(true), 600);
    return () => clearTimeout(timer);
  }, [mounted, consent]);

  const visible = showAfterDelay && !dismissed;

  const handleGrant = React.useCallback(() => {
    setDismissed(true);
    setTimeout(grant, 200);
  }, [grant]);

  const handleDeny = React.useCallback(() => {
    setDismissed(true);
    setTimeout(deny, 200);
  }, [deny]);

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Cookie consent"
      data-cookie-banner
      className={cn(
        "fixed bottom-4 right-4 z-[9997] w-[calc(100%-2rem)] max-w-sm",
        "transition-all duration-300 ease-out",
        mounted && consent === null && visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-6 opacity-0 pointer-events-none",
      )}
    >
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-xl" />
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60",
          "bg-card/85 p-5 shadow-2xl backdrop-blur-2xl",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              "bg-primary/10 text-primary ring-1 ring-primary/20",
            )}
            aria-hidden="true"
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-card-foreground">
              Your privacy matters
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              We use essential cookies to keep things running and optional
              analytics to improve your experience. You can change this anytime.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={handleGrant}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg",
                  "bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                  "transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                )}
              >
                Accept all
              </button>
              <button
                onClick={handleDeny}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg",
                  "px-4 py-2 text-sm font-medium text-muted-foreground",
                  "transition-colors hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                )}
              >
                Decline
              </button>
            </div>
          </div>
          <button
            onClick={handleDeny}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "text-muted-foreground transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            )}
            aria-label="Close cookie banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
