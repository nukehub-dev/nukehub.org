"use client";

import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let current = 0;

    const update = () => {
      const target =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      current += (target - current) * 0.12;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, current))})`;
      }
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] bg-primary origin-left"
    />
  );
}
