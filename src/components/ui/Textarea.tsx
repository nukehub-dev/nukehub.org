import * as React from "react";
import { cn } from "@lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, error, autoResize = true, onChange, value, ...props },
    forwardedRef,
  ) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(forwardedRef, () => internalRef.current!);

    const resize = React.useCallback(() => {
      if (!autoResize) return;
      const el = internalRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [autoResize]);

    // Resize when the controlled value changes (e.g. localStorage restore)
    React.useLayoutEffect(() => {
      resize();
    }, [resize, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      resize();
      onChange?.(e);
    };

    return (
      <textarea
        ref={internalRef}
        aria-invalid={error ? true : undefined}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-input bg-input/80 px-3 py-2 text-sm shadow-sm transition-colors backdrop-blur-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          autoResize ? "resize-none overflow-hidden" : "resize-y",
          className,
        )}
        onChange={handleChange}
        value={value}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
