"use client";

import { motion, useReducedMotion } from "framer-motion";

export function PeopleFloatingDots({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const dots = [
    { x: "10%", y: "20%", size: 5, duration: 13, delay: 0 },
    { x: "22%", y: "55%", size: 4, duration: 15, delay: 1 },
    { x: "38%", y: "25%", size: 7, duration: 11, delay: 2 },
    { x: "58%", y: "65%", size: 5, duration: 14, delay: 0.5 },
    { x: "72%", y: "20%", size: 6, duration: 12, delay: 3 },
    { x: "85%", y: "50%", size: 4, duration: 16, delay: 1.5 },
    { x: "48%", y: "80%", size: 6, duration: 13, delay: 2.5 },
    { x: "15%", y: "75%", size: 5, duration: 17, delay: 0.8 },
    { x: "90%", y: "15%", size: 5, duration: 12, delay: 4 },
    { x: "32%", y: "40%", size: 4, duration: 18, delay: 1.2 },
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
          initial={{ opacity: 0.25 }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -18, 0, 8, 0],
                  x: [0, 8, 0, -8, 0],
                  opacity: [0.25, 0.5, 0.25, 0.4, 0.25],
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
