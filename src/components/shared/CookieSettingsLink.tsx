"use client";

import { cn } from "@lib/utils";

export function CookieSettingsLink({
  className,
}: {
  className?: string;
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (typeof window === "undefined") return;
    localStorage.removeItem("cookie-consent");
    window.dispatchEvent(
      new CustomEvent("cookie-consent-change", { detail: { consent: null } }),
    );
  };

  return (
    <button
      type="button"
      data-cookie-settings
      onClick={handleClick}
      className={cn(
        "group relative text-xs text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      Cookie settings
      <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
    </button>
  );
}
