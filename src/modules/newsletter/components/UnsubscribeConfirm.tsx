import * as React from "react";
import { MailX } from "lucide-react";

import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";

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
      <Card variant="bubble" className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <MailX className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          Invalid unsubscribe link
        </h1>
        <p className="mt-2 text-muted-foreground">
          This link is missing its token. Use the unsubscribe link from one of
          our emails, or unsubscribe from the footer of any page.
        </p>
      </Card>
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
      <Card variant="bubble" className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MailX className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          You have been unsubscribed
        </h1>
        <p className="mt-2 text-muted-foreground">
          {email
            ? `${email} will no longer receive newsletter emails.`
            : "You will no longer receive newsletter emails."}
        </p>
      </Card>
    );
  }

  return (
    <Card variant="bubble" className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <MailX className="h-7 w-7 text-primary" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        Unsubscribe from the newsletter
      </h1>
      <p className="mt-2 text-muted-foreground">
        {email
          ? `Stop sending newsletter emails to ${email}?`
          : "Stop receiving newsletter emails?"}
      </p>
      {status === "error" && errorMessage && (
        <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
      )}
      <Button
        onClick={handleConfirm}
        loading={status === "working"}
        className="mt-6"
      >
        Confirm unsubscribe
      </Button>
    </Card>
  );
}
