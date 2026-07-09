"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@components/ui/Button";
import { cn } from "@lib/utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center",
          this.props.className,
        )}
        role="alert"
        aria-live="polite"
      >
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle size={20} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {this.props.title || "This section couldn't load"}
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {this.props.description ||
            "Something went wrong while rendering this part of the page."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={this.handleRetry}
          className="mt-4"
        >
          <RotateCcw size={14} className="mr-1.5" />
          Try again
        </Button>
      </div>
    );
  }
}
