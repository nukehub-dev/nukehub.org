"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
  useLayoutEffect,
  createContext,
  Children,
  isValidElement,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@lib/utils";

/* ───────────────────────────────────────────────────────────
   Context – lets items signal "close me"
   ─────────────────────────────────────────────────────────── */
interface ContextMenuCtx {
  close: () => void;
}

const ContextMenuContext = createContext<ContextMenuCtx>({ close: () => {} });

/* ───────────────────────────────────────────────────────────
   GlassContextMenu
   ─────────────────────────────────────────────────────────── */
interface GlassContextMenuProps {
  children: React.ReactNode;
  scopeRef?: React.RefObject<HTMLElement | null>;
  title?: string;
}

export function GlassContextMenu({
  children,
  scopeRef,
  title,
}: GlassContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (scopeRef?.current && !scopeRef.current.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
      if (scopeRef?.current) {
        e.stopPropagation();
      }
      setPosition({ x: e.clientX, y: e.clientY });
      setIsOpen(true);
    },
    [scopeRef],
  );

  useEffect(() => {
    const target = scopeRef?.current ?? document;
    target.addEventListener("contextmenu", handleContextMenu as EventListener);
    return () =>
      target.removeEventListener(
        "contextmenu",
        handleContextMenu as EventListener,
      );
  }, [handleContextMenu, scopeRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleScroll = () => setIsOpen(false);
    const handleResize = () => setIsOpen(false);

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();

    let x = position.x;
    let y = position.y;

    /* flip horizontally if off-screen right */
    if (x + rect.width > window.innerWidth - 12) {
      x = position.x - rect.width;
    }
    /* flip vertically if off-screen bottom */
    if (y + rect.height > window.innerHeight - 12) {
      y = position.y - rect.height;
    }

    setAdjustedPos({
      x: Math.max(12, x),
      y: Math.max(12, y),
    });
  }, [isOpen, position]);

  if (!mounted) return null;

  const childArray = Children.toArray(children);

  const menu = (
    <AnimatePresence>
      {isOpen && (
        <ContextMenuContext.Provider value={{ close }}>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.88, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 26,
              mass: 0.8,
            }}
            className={cn(
              "bubble fixed z-[9998] overflow-hidden",
              "!backdrop-blur-2xl",
              "flex flex-col",
              "min-w-[200px] py-1.5 px-1.5",
            )}
            style={{
              left: adjustedPos.x,
              top: adjustedPos.y,
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.08) inset, " +
                "0 0 0 1px rgba(0,0,0,0.04), " +
                "0 8px 32px rgba(0,0,0,0.12), " +
                "0 32px 64px -16px rgba(0,0,0,0.18), " +
                "0 0 80px -20px color-mix(in oklch, var(--primary) 25%, transparent)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <>
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80 select-none">
                  {title}
                </div>
                <div className="relative mx-3 mb-1 h-px overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border/70 to-transparent" />
                </div>
              </>
            )}

            {childArray.map((child, i) =>
              isValidElement(child) ? (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.04 + i * 0.025,
                    duration: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {child}
                </motion.div>
              ) : (
                child
              ),
            )}
          </motion.div>
        </ContextMenuContext.Provider>
      )}
    </AnimatePresence>
  );

  return createPortal(menu, document.body);
}

/* ───────────────────────────────────────────────────────────
   ContextMenuItem
   ─────────────────────────────────────────────────────────── */
interface ContextMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  target?: string;
  rel?: string;
  shortcut?: React.ReactNode;
  variant?: "default" | "danger";
}

export function ContextMenuItem({
  icon: Icon,
  href,
  target,
  rel,
  shortcut,
  variant = "default",
  className,
  children,
  onClick,
  disabled,
  ...props
}: ContextMenuItemProps) {
  const { close } = useContext(ContextMenuContext);

  const handleClick = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>,
  ) => {
    if (disabled) return;
    onClick?.(e as React.MouseEvent<HTMLButtonElement>);
    close();
  };

  const content = (
    <>
      {Icon && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon
            className={cn(
              "h-4 w-4 transition-colors duration-150",
              variant === "danger"
                ? "text-red-400/80 group-hover:text-red-400"
                : "text-muted-foreground/70 group-hover:text-foreground",
            )}
          />
        </span>
      )}
      <span className="flex-1 truncate text-left font-medium">{children}</span>
      {shortcut && (
        <span
          className={cn(
            "ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider",
            "border border-border/40 bg-background/50 text-muted-foreground/60",
          )}
        >
          {shortcut}
        </span>
      )}
    </>
  );

  const baseClass = cn(
    "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
    "transition-all duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    disabled && "pointer-events-none opacity-40",
    variant === "danger"
      ? "text-red-400/90 hover:bg-red-500/[0.08] hover:text-red-400 active:scale-[0.97]"
      : "text-popover-foreground/90 hover:bg-white/[0.06] hover:text-foreground active:scale-[0.97]",
    className,
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={baseClass}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={baseClass}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {content}
    </button>
  );
}

/* ───────────────────────────────────────────────────────────
   ContextMenuSub – hover-to-reveal flyout submenu
   ─────────────────────────────────────────────────────────── */
interface ContextMenuSubProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

export function ContextMenuSub({
  label,
  icon: Icon,
  children,
}: ContextMenuSubProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [subPos, setSubPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* Measure and position AFTER the submenu is in the DOM */
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const tRect = triggerRef.current.getBoundingClientRect();
    const mRect = menuRef.current.getBoundingClientRect();
    const pad = 8;

    let x = tRect.right + 2;
    let y = tRect.top - 2;

    /* horizontal flip */
    if (x + mRect.width > window.innerWidth - pad) {
      x = tRect.left - mRect.width - 2;
    }

    /* vertical: prefer aligning tops, flip upward if needed */
    if (y + mRect.height > window.innerHeight - pad) {
      y = tRect.bottom - mRect.height + 2;
    }
    if (y < pad) y = pad;

    setSubPos({ x, y });
    setReady(true);
  }, [open]);

  useEffect(() => {
    if (!open) setReady(false);
  }, [open]);

  const scheduleShow = useCallback(() => {
    clearTimeout(hideTimer.current);
    clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => setOpen(true), 60);
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    clearTimeout(showTimer.current);
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={scheduleShow}
        onMouseLeave={scheduleHide}
        className={cn(
          "group relative flex w-full cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
          "transition-all duration-150",
          open
            ? "bg-white/[0.08] text-foreground"
            : "text-popover-foreground/90 hover:bg-white/[0.06] hover:text-foreground",
        )}
      >
        {/* Subtle active indicator */}
        <div
          className={cn(
            "absolute left-[3px] top-2 bottom-2 w-[2px] rounded-full bg-primary/70 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        {Icon && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Icon
              className={cn(
                "h-4 w-4 transition-colors duration-150",
                open
                  ? "text-foreground"
                  : "text-muted-foreground/70 group-hover:text-foreground",
              )}
            />
          </span>
        )}
        <span className="flex-1 truncate text-left font-medium">{label}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-all duration-200",
            open
              ? "translate-x-0.5 text-foreground"
              : "text-muted-foreground/50 group-hover:text-foreground",
          )}
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              "bubble fixed z-[9999]",
              "!backdrop-blur-2xl",
              "flex flex-col",
              "min-w-[180px] py-1.5 px-1.5",
            )}
            style={{
              left: subPos.x,
              top: subPos.y,
              opacity: ready ? 1 : 0,
              animation: ready
                ? "cmFadeIn 0.15s cubic-bezier(0.16,1,0.3,1)"
                : "none",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.12) inset, " +
                "0 0 0 1px rgba(0,0,0,0.04), " +
                "0 16px 48px rgba(0,0,0,0.16), " +
                "0 40px 80px -20px rgba(0,0,0,0.22), " +
                "0 0 80px -16px color-mix(in oklch, var(--primary) 22%, transparent)",
            }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ───────────────────────────────────────────────────────────
   ContextMenuSeparator
   ─────────────────────────────────────────────────────────── */
export function ContextMenuSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-3 my-1.5 h-px overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border/70 to-transparent" />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   ContextMenuLabel
   ─────────────────────────────────────────────────────────── */
export function ContextMenuLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 select-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
