import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@lib/utils";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

const GAP = 8;
const VIEWPORT_PADDING = 8;

function computePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  preferred: TooltipPosition,
): { x: number; y: number; final: TooltipPosition } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const fits = {
    top: triggerRect.top - GAP - tooltipRect.height >= VIEWPORT_PADDING,
    bottom:
      triggerRect.bottom + GAP + tooltipRect.height <= vh - VIEWPORT_PADDING,
    left: triggerRect.left - GAP - tooltipRect.width >= VIEWPORT_PADDING,
    right: triggerRect.right + GAP + tooltipRect.width <= vw - VIEWPORT_PADDING,
  };

  let pos = preferred;
  if (!fits[preferred]) {
    const flip: Record<TooltipPosition, TooltipPosition> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };
    pos = fits[flip[preferred]]
      ? flip[preferred]
      : fits.bottom
        ? "bottom"
        : fits.top
          ? "top"
          : "bottom";
  }

  let x = 0;
  let y = 0;

  switch (pos) {
    case "top":
      x = triggerRect.left + triggerRect.width / 2;
      y = triggerRect.top - GAP;
      break;
    case "bottom":
      x = triggerRect.left + triggerRect.width / 2;
      y = triggerRect.bottom + GAP;
      break;
    case "left":
      x = triggerRect.left - GAP;
      y = triggerRect.top + triggerRect.height / 2;
      break;
    case "right":
      x = triggerRect.right + GAP;
      y = triggerRect.top + triggerRect.height / 2;
      break;
  }

  if (pos === "top" || pos === "bottom") {
    x = Math.max(
      VIEWPORT_PADDING + tooltipRect.width / 2,
      Math.min(vw - VIEWPORT_PADDING - tooltipRect.width / 2, x),
    );
  } else {
    y = Math.max(
      VIEWPORT_PADDING + tooltipRect.height / 2,
      Math.min(vh - VIEWPORT_PADDING - tooltipRect.height / 2, y),
    );
  }

  return { x, y, final: pos };
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 250,
  className,
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const [positioned, setPositioned] = React.useState(false);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const [actualPos, setActualPos] = React.useState<TooltipPosition>(position);
  const childRef = React.useRef<HTMLSpanElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = React.useCallback(() => {
    const child = childRef.current;
    const tooltip = tooltipRef.current;
    if (!child || !tooltip) return;

    const childRect = child.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const { x, y, final } = computePosition(childRect, tooltipRect, position);

    setCoords({ x, y });
    setActualPos(final);
    setPositioned(true);
  }, [position]);

  const show = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPositioned(false);
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(updatePosition);
      });
    }, delay);
  }, [delay, updatePosition]);

  const hide = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setPositioned(false);
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    const handleReposition = () => updatePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [visible, updatePosition]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const transform =
    actualPos === "top"
      ? "translate(-50%, -100%)"
      : actualPos === "bottom"
        ? "translate(-50%, 0)"
        : actualPos === "left"
          ? "translate(-100%, -50%)"
          : "translate(0, -50%)";

  return (
    <>
      <span
        ref={childRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-xl pointer-events-none z-[9999]",
              "bg-popover text-popover-foreground border border-border/80 backdrop-blur-sm",
              className,
            )}
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.y,
              transform,
              opacity: positioned ? 1 : 0,
              transition: "opacity 0.12s ease",
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
