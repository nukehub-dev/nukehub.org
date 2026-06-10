"use client";

import { motion, useReducedMotion } from "framer-motion";

export function EventsFloatingDots({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const dots = [
    { x: "15%", y: "15%", size: 6, duration: 14, delay: 0 },
    { x: "35%", y: "60%", size: 4, duration: 16, delay: 2 },
    { x: "55%", y: "30%", size: 7, duration: 12, delay: 1 },
    { x: "75%", y: "70%", size: 5, duration: 15, delay: 3 },
    { x: "88%", y: "25%", size: 4, duration: 13, delay: 0.5 },
    { x: "42%", y: "80%", size: 6, duration: 17, delay: 2.5 },
    { x: "62%", y: "50%", size: 5, duration: 11, delay: 1.5 },
    { x: "8%", y: "55%", size: 4, duration: 18, delay: 3.5 },
  ];

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            backgroundColor:
              "color-mix(in oklch, var(--primary) 35%, transparent)",
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -20, 0, 10, 0],
                  x: [0, 10, 0, -10, 0],
                  opacity: [0.2, 0.45, 0.2, 0.35, 0.2],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: dot.duration,
                  delay: dot.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}
