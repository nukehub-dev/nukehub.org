import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

import { cn } from "@lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  error = false,
  className,
  triggerClassName,
  id,
  name,
  required,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>(
    { position: "fixed", top: 0, left: 0, width: 0 },
  );
  const [mounted, setMounted] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const labelId = React.useId();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((option) => option.value === value);
  const dropdownOptions = options.filter((option) => option.value !== "");
  const enabledOptions = dropdownOptions.filter((option) => !option.disabled);

  const close = React.useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        close();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, close]);

  const DROPDOWN_MAX_HEIGHT = 240;

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const gap = 4;

    const spaceBelow = viewportHeight - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;
    const placeTop =
      spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: triggerRect.left,
      top: placeTop
        ? triggerRect.top - gap - DROPDOWN_MAX_HEIGHT
        : triggerRect.bottom + gap,
      width: triggerRect.width,
      maxHeight: DROPDOWN_MAX_HEIGHT,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;

    updatePosition();

    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (open && highlightedIndex >= 0) {
      const option = document.getElementById(
        `${listId}-option-${highlightedIndex}`,
      );
      option?.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlightedIndex, listId]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev >= enabledOptions.length - 1 ? 0 : prev + 1,
          );
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(enabledOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev <= 0 ? enabledOptions.length - 1 : prev - 1,
          );
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else if (highlightedIndex >= 0) {
          onChange?.(enabledOptions[highlightedIndex].value);
          close();
        }
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        if (open) close();
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setHighlightedIndex(enabledOptions.length - 1);
        }
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange?.(optionValue);
    close();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Hidden native select keeps form semantics and accessibility simple */}
      <select
        id={id}
        name={name}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={
          open && highlightedIndex >= 0
            ? `${listId}-option-${highlightedIndex}`
            : undefined
        }
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-input/80 px-3 py-1 text-sm text-left shadow-sm transition-colors backdrop-blur-sm",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          open && "ring-[3px] ring-ring/50",
          !selectedOption && "text-muted-foreground",
          triggerClassName,
        )}
      >
        <span id={labelId} className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={dropdownRef}
                style={dropdownStyle}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="z-99 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
              >
                <ul
                  id={listId}
                  role="listbox"
                  className="max-h-60 space-y-1 overflow-auto p-1.5"
                >
                  {dropdownOptions.map((option, index) => {
                    const isHighlighted = highlightedIndex === index;
                    const isSelected = option.value === value;
                    return (
                      <li
                        key={option.value}
                        id={`${listId}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled}
                        tabIndex={-1}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onPointerDown={(e) => {
                          e.preventDefault();
                        }}
                        onPointerUp={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!option.disabled) {
                            handleOptionClick(option.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (option.disabled) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleOptionClick(option.value);
                          }
                        }}
                        className={cn(
                          "relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors",
                          option.disabled && "cursor-not-allowed opacity-50",
                          isHighlighted && "bg-accent text-accent-foreground",
                          !isHighlighted &&
                            !isSelected &&
                            "text-popover-foreground hover:bg-accent",
                          isSelected &&
                            !isHighlighted &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <Check
                          size={16}
                          className={cn(
                            "shrink-0 transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1 whitespace-nowrap text-left">
                          {option.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
