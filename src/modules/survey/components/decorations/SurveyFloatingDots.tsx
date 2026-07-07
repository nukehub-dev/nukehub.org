"use client";

import { motion, useReducedMotion } from "framer-motion";

export function SurveyFloatingDots({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const dots = [
    { x: "12%", y: "18%", size: 6, duration: 14, delay: 0 },
    { x: "28%", y: "55%", size: 4, duration: 16, delay: 2 },
    { x: "48%", y: "25%", size: 7, duration: 12, delay: 1 },
    { x: "68%", y: "65%", size: 5, duration: 15, delay: 3 },
    { x: "86%", y: "22%", size: 4, duration: 13, delay: 0.5 },
    { x: "38%", y: "78%", size: 6, duration: 17, delay: 2.5 },
    { x: "58%", y: "48%", size: 5, duration: 11, delay: 1.5 },
    { x: "8%", y: "50%", size: 4, duration: 18, delay: 3.5 },
    { x: "76%", y: "82%", size: 3, duration: 14, delay: 1.2 },
  ];

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
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
          initial={{ opacity: 0.2 }}
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
