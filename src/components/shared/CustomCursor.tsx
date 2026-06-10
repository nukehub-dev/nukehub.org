"use client";

import { useEffect, useRef, useState } from "react";

const R = 0.5;

export function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [inViewport, setInViewport] = useState(true);

  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  // positions stored in refs to avoid re-renders on every mousemove
  const cursorPos = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const targetPos = useRef({ x: -100, y: -100 });
  const rafRef = useRef(0);

  useEffect(() => {
    const hasFinePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!hasFinePointer || prefersReducedMotion) return;

    setVisible(true);
    document.body.classList.add("custom-cursor-active");

    let active = true;

    const moveCursor = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'a, button, [role="button"], input, textarea, select, [data-cursor-hover], .cursor-pointer',
        )
      ) {
        setHovering(true);
      }
    };

    const handleOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'a, button, [role="button"], input, textarea, select, [data-cursor-hover], .cursor-pointer',
        )
      ) {
        setHovering(false);
      }
    };

    const step = () => {
      if (!active) return;

      const kCursor = 0.35;
      const kTrail = 0.08;

      cursorPos.current.x +=
        (targetPos.current.x - cursorPos.current.x) * kCursor;
      cursorPos.current.y +=
        (targetPos.current.y - cursorPos.current.y) * kCursor;
      trailPos.current.x += (cursorPos.current.x - trailPos.current.x) * kTrail;
      trailPos.current.y += (cursorPos.current.y - trailPos.current.y) * kTrail;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorPos.current.x}px, ${cursorPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${trailPos.current.x}px, ${trailPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);
    window.addEventListener("mousedown", () => setClicking(true));
    window.addEventListener("mouseup", () => setClicking(false));
    document.body.addEventListener("mouseleave", () => setInViewport(false));
    document.body.addEventListener("mouseenter", () => setInViewport(true));

    rafRef.current = requestAnimationFrame(step);

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      window.removeEventListener("mousedown", () => setClicking(true));
      window.removeEventListener("mouseup", () => setClicking(false));
      document.body.removeEventListener("mouseleave", () =>
        setInViewport(false),
      );
      document.body.removeEventListener("mouseenter", () =>
        setInViewport(true),
      );
      document.body.classList.remove("custom-cursor-active");
    };
  }, []);

  if (!visible) return null;

  const ringSize = hovering ? 144 : 104;
  const ringOpacity = !inViewport ? 0 : clicking ? 0.06 : 0.12;
  const glowSize = hovering ? 176 : 128;
  const glowOpacity = !inViewport ? 0 : clicking ? 0.25 : hovering ? 0.55 : 0.4;
  const glassSize = hovering ? 96 : 64;
  const glassOpacity = !inViewport ? 0 : clicking ? 0.5 : 0.9;
  const innerSize = hovering ? 40 : 28;
  const innerOpacity = !inViewport ? 0 : clicking ? 0.5 : 0.85;
  const dotSize = !inViewport ? 0 : clicking ? 8 : hovering ? 4 : 8;

  return (
    <>
      <div
        ref={trailRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block"
        style={{
          translate: "0 0",
          mixBlendMode: "difference",
          willChange: "transform",
        }}
      >
        <div
          style={{ transform: `scale(${R})`, transformOrigin: "center center" }}
        >
          <div
            className="rounded-full transition-all duration-300 ease-out"
            style={{
              border: "2px solid white",
              width: ringSize,
              height: ringSize,
              opacity: ringOpacity,
            }}
          />
        </div>
      </div>

      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[10000] hidden md:block"
        style={{
          translate: "0 0",
          mixBlendMode: "difference",
          willChange: "transform",
        }}
      >
        <div
          style={{ transform: `scale(${R})`, transformOrigin: "center center" }}
        >
          <div
            className="rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
              width: glowSize,
              height: glowSize,
              opacity: glowOpacity,
            }}
          />
          <div
            className="rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
            style={{
              border: "3px solid rgba(255,255,255,0.9)",
              boxShadow:
                "0 0 0 2px rgba(255,255,255,0.12), " +
                "0 0 48px 6px rgba(255,255,255,0.15), " +
                "inset 0 0 24px rgba(255,255,255,0.08)",
              width: glassSize,
              height: glassSize,
              opacity: glassOpacity,
            }}
          />
          <div
            className="rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
            style={{
              border: "2px solid rgba(255,255,255,0.55)",
              width: innerSize,
              height: innerSize,
              opacity: innerOpacity,
            }}
          />
          <div
            className="rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
            style={{
              boxShadow:
                "0 0 16px 6px rgba(255,255,255,0.55), " +
                "0 0 36px 14px rgba(255,255,255,0.28)",
              width: dotSize,
              height: dotSize,
            }}
          />
        </div>
      </div>
    </>
  );
}
