import * as React from "react";
import { cn } from "@lib/utils";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  className?: string;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  className,
}: RadioGroupProps) {
  const generatedName = React.useId();
  const groupName = name ?? generatedName;

  return (
    <div className={cn("space-y-2", className)} role="radiogroup">
      {options.map((option) => {
        const inputId = `${groupName}-${option.value}`;
        const checked = option.value === value;

        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className={cn(
              "group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
              checked
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-background/50 hover:bg-muted",
              option.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div className="relative flex shrink-0 items-center justify-center">
              <input
                id={inputId}
                type="radio"
                name={groupName}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={() => onChange?.(option.value)}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150",
                  checked
                    ? "border-primary bg-primary"
                    : "border-input bg-input/50 group-hover:border-primary/50",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full bg-primary-foreground transition-all duration-150",
                    checked ? "opacity-100 scale-100" : "opacity-0 scale-75",
                  )}
                />
              </div>
            </div>
            <span className="text-sm text-foreground">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
