import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@lib/utils";

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Checkbox({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  className,
  children,
}: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
        checked
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background/50 hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="relative flex shrink-0 items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150",
            checked
              ? "border-primary bg-primary"
              : "border-input bg-input/50 group-hover:border-primary/50",
          )}
        >
          <Check
            size={12}
            strokeWidth={3}
            className={cn(
              "text-primary-foreground transition-all duration-150",
              checked ? "opacity-100 scale-100" : "opacity-0 scale-75",
            )}
          />
        </div>
      </div>
      {children && <span className="text-sm text-foreground">{children}</span>}
    </label>
  );
}
