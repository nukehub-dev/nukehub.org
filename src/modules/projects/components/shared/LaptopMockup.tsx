"use client";

import { cn } from "@lib/utils";
import type { ReactNode } from "react";

interface LaptopMockupProps {
  children: ReactNode;
  className?: string;
}

export function LaptopMockup({ children, className }: LaptopMockupProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full px-2 pb-10 pt-4 sm:px-8",
        className,
      )}
    >
      {/* Top Lid */}
      <div className="relative z-10 rounded-t-xl bg-[#1c1c1c] p-1.5 sm:p-2 pb-0 shadow-2xl ring-1 ring-white/10 sm:rounded-t-2xl">
        {/* Webcam */}
        <div className="absolute top-3 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-black ring-[0.5px] ring-white/20 sm:h-1.5 sm:w-1.5" />

        {/* Screen */}
        <div className="relative w-full overflow-hidden rounded-t-md sm:rounded-t-lg">
          {children}
        </div>
      </div>

      {/* Hinge */}
      <div className="relative z-20 h-2 w-full sm:h-3">
        <div className="absolute inset-x-4 top-0 h-full rounded-b-lg bg-[#1c1c1c] sm:inset-x-8 sm:rounded-b-xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      </div>

      {/* Base */}
      <div className="relative z-30 h-3 w-full sm:h-4">
        <div className="absolute -inset-x-[4%] bottom-0 top-0 rounded-b-lg bg-gradient-to-b from-[#2a2a2a] to-[#111] shadow-[0_15px_25px_rgba(0,0,0,0.5)] border-t border-white/5 ring-1 ring-black/50 sm:-inset-x-[5%] sm:rounded-b-2xl">
          <div className="absolute inset-x-[40%] top-0 h-1 rounded-b-md bg-black/40 shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)] sm:h-1.5" />
        </div>
      </div>

      {/* Drop shadow */}
      <div className="pointer-events-none absolute -bottom-4 left-1/2 z-0 h-6 w-[80%] -translate-x-1/2 rounded-full bg-black/50 blur-xl" />
    </div>
  );
}
