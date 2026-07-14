import * as React from "react";
import { MailCheck, MailX, Unlink } from "lucide-react";

import { Button } from "@components/ui/Button";

type Status = "confirm" | "working" | "done" | "error";

function decodeEmailFromToken(token: string): string | null {
  const [payload] = token.split(".");
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return atob(base64);
  } catch {
    return null;
  }
}

function StateBadge({
  icon: Icon,
  label,
  destructive = false,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  destructive?: boolean;
}) {
  return (
    <div className="mb-6 animate-text-reveal animate-text-reveal-1">
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${
          destructive
            ? "border-destructive/20 bg-destructive/5 text-destructive"
            : "border-primary/20 bg-primary/5 text-primary"
        }`}
      >
        <Icon size={16} />
        {label}
      </span>
    </div>
  );
}

function HomeCta({ label }: { label: string }) {
  return (
    <a
      href="/"
      className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {label}
    </a>
  );
}

export function UnsubscribeConfirm() {
  // undefined = not yet read from the URL, null = URL has no token.
  const [token, setToken] = React.useState<string | null | undefined>(
    undefined,
  );
  const [status, setStatus] = React.useState<Status>("confirm");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  // Wait for the token to be read from the URL before rendering.
  if (token === undefined) {
    return null;
  }

  if (token === null) {
    return (
      <div className="flex flex-col items-center text-center">
        <StateBadge icon={Unlink} label="Invalid link" destructive />
        <h1 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground animate-text-reveal animate-text-reveal-2 sm:text-5xl">
          This link has decayed
        </h1>
        <p className="mt-3 max-w-md text-base text-muted-foreground animate-text-reveal animate-text-reveal-3 sm:text-lg">
          It is missing its token — unsubscribe links have a short half-life
          around here. Grab the link from a recent email, or unsubscribe from
          the footer of any page.
        </p>
        <div className="mt-10 animate-text-reveal animate-text-reveal-3">
          <HomeCta label="Return to safe orbit" />
        </div>
      </div>
    );
  }

  const email = decodeEmailFromToken(token);

  const handleConfirm = async () => {
    setStatus("working");
    setErrorMessage(null);
    try {
      const base = (import.meta.env.PUBLIC_API_URL || "/api").replace(
        /\/$/,
        "",
      );
      const response = await fetch(`${base}/newsletter/unsubscribe/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : `Unsubscribe failed (${response.status})`,
        );
      }
      setStatus("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex flex-col items-center text-center">
        <StateBadge icon={MailCheck} label="Unsubscribed" />
        <h1 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground animate-text-reveal animate-text-reveal-2 sm:text-5xl">
          Transmission ended
        </h1>
        <p className="mt-3 max-w-md text-base text-muted-foreground animate-text-reveal animate-text-reveal-3 sm:text-lg">
          {email ? `${email} has left the mailing loop. ` : ""}
          No hard feelings — you can still catch every post on the blog, just
          without the inbox noise.
        </p>
        <div className="mt-6 animate-text-reveal animate-text-reveal-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
              aria-hidden="true"
            ></span>
            The airlock is always open if you want back in
          </span>
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 animate-text-reveal animate-text-reveal-3 sm:flex-row">
          <HomeCta label="Return to safe orbit" />
          <a
            href="https://blog.nukehub.org"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Visit the blog
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <StateBadge icon={MailX} label="Unsubscribe" />
      <h1 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground animate-text-reveal animate-text-reveal-2 sm:text-5xl">
        Cutting the signal?
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground animate-text-reveal animate-text-reveal-3 sm:text-lg">
        {email
          ? `We'll stop transmitting newsletter emails to ${email}. `
          : "We'll stop transmitting newsletter emails. "}
        The reactor will run a little quieter without you.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-muted-foreground animate-text-reveal animate-text-reveal-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          ></span>
          No captcha, no questions
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          ></span>
          Instant effect
        </span>
      </div>
      {status === "error" && errorMessage && (
        <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
      )}
      <div className="mt-10 flex flex-col items-center gap-3 animate-text-reveal animate-text-reveal-3 sm:flex-row">
        <Button onClick={handleConfirm} loading={status === "working"}>
          Confirm unsubscribe
        </Button>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Changed my mind
        </a>
      </div>
    </div>
  );
}
