import * as React from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { cn } from "@lib/utils";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@components/ui/Dialog";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";

interface NewsletterSignupProps {
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "compact" | "card";
  layout?: "inline" | "button";
  source?: string;
  allowUnsubscribe?: boolean;
}

const API_URL = import.meta.env.PUBLIC_API_URL ?? "";
const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function NewsletterSignup({
  title = "Subscribe to our newsletter",
  description = "Get the latest nuclear engineering news, tutorials, and updates delivered to your inbox.",
  className,
  variant = "default",
  layout = "inline",
  source = "newsletter",
  allowUnsubscribe = true,
}: NewsletterSignupProps) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"subscribe" | "unsubscribe">(
    "subscribe",
  );
  const [turnstileToken, setTurnstileToken] = React.useState("");

  const isValidEmail = (value: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const trimmed = email.trim().toLowerCase();
    if (trimmed === "" || !isValidEmail(trimmed)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    if (API_URL === "") {
      setStatus("error");
      setMessage("Newsletter signup is not configured.");
      return;
    }

    if (TURNSTILE_SITE_KEY !== "" && turnstileToken === "") {
      setStatus("error");
      setMessage("Please complete the CAPTCHA verification.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const endpoint =
      mode === "subscribe"
        ? `${API_URL}/newsletter`
        : `${API_URL}/newsletter/unsubscribe`;
    const body =
      mode === "subscribe"
        ? { email: trimmed, turnstileToken, source }
        : { email: trimmed, turnstileToken };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        errors?: Record<string, string>;
      };

      if (response.ok && data.success) {
        setStatus("success");
        setMessage(
          data.message ??
            (mode === "subscribe"
              ? "Thanks for subscribing!"
              : "You have been unsubscribed."),
        );
        setEmail("");
        setTurnstileToken("");
      } else {
        setStatus("error");
        setMessage(
          data.errors?.email ??
            data.message ??
            "Something went wrong. Please try again.",
        );
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again later.");
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "subscribe" ? "unsubscribe" : "subscribe"));
    setStatus("idle");
    setMessage("");
    setEmail("");
    setTurnstileToken("");
  };

  const isCompact = variant === "compact";
  const isCard = variant === "card";

  const currentTitle =
    mode === "subscribe"
      ? title || "Subscribe to our newsletter"
      : "Unsubscribe from newsletter";
  const currentDescription =
    mode === "subscribe"
      ? description || "Get the latest updates delivered to your inbox."
      : "Enter your email to stop receiving newsletter emails.";

  const header = (currentTitle || currentDescription) && (
    <div>
      {currentTitle && (
        <h3
          className={cn(
            "font-semibold tracking-tight",
            isCompact ? "text-sm" : "text-base",
          )}
        >
          {currentTitle}
        </h3>
      )}
      {currentDescription && (
        <p
          className={cn(
            "mt-0.5 text-muted-foreground",
            isCompact ? "text-xs" : "text-sm",
          )}
        >
          {currentDescription}
        </p>
      )}
    </div>
  );

  const form = (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full flex-row items-start gap-2"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative">
          <Mail
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
            className={cn("pl-9", isCompact && "h-8 text-sm")}
          />
        </div>
        {TURNSTILE_SITE_KEY !== "" && (
          <>
            <Turnstile
              key={mode}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken("")}
              onExpire={() => setTurnstileToken("")}
              options={{
                theme: "auto",
                size: "invisible",
                appearance: "interaction-only",
              }}
            />
            <p className="text-[11px] leading-snug text-muted-foreground/60">
              Protected by Cloudflare Turnstile.{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-muted-foreground"
              >
                Privacy
              </a>
              {" · "}
              <a
                href="https://www.cloudflare.com/website-terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-muted-foreground"
              >
                Terms
              </a>
            </p>
          </>
        )}
      </div>
      <Button
        type="submit"
        loading={status === "loading"}
        disabled={status === "success"}
        size={isCompact ? "sm" : "default"}
        className="shrink-0"
      >
        {status === "success"
          ? mode === "subscribe"
            ? "Subscribed"
            : "Unsubscribed"
          : mode === "subscribe"
            ? "Subscribe"
            : "Unsubscribe"}
      </Button>
    </form>
  );

  const feedback = status !== "idle" && status !== "loading" && (
    <div
      className={cn(
        "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        status === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
          : "border-red-500/20 bg-red-500/10 text-red-900 dark:text-red-100",
      )}
      role="status"
      aria-live="polite"
    >
      {status === "success" ? (
        <CheckCircle size={16} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );

  const modeToggle = allowUnsubscribe && (
    <button
      type="button"
      onClick={toggleMode}
      className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {mode === "subscribe"
        ? "Already subscribed? Unsubscribe instead."
        : "Want to subscribe? Subscribe instead."}
    </button>
  );

  if (layout === "button") {
    return (
      <div className={className}>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          size={isCompact ? "sm" : "default"}
        >
          {title || "Subscribe"}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {currentTitle || "Subscribe to our newsletter"}
              </DialogTitle>
              <DialogDescription>{currentDescription}</DialogDescription>
            </DialogHeader>
            <DialogClose />
            <div className="px-6 pb-6">
              {form}
              {feedback}
              {modeToggle}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative",
        isCard &&
          "rounded-2xl border border-border/50 bg-card p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        {header}
        {form}
      </div>
      {feedback}
      {modeToggle}
    </div>
  );
}
