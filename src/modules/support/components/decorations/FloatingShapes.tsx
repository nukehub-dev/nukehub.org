"use client";

import { motion, useReducedMotion } from "framer-motion";

export function FloatingShapes({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const shapes = [
    { type: "circle", x: "8%", y: "15%", size: 120, delay: 0, duration: 14 },
    { type: "ring", x: "88%", y: "20%", size: 80, delay: 2, duration: 16 },
    { type: "circle", x: "75%", y: "75%", size: 100, delay: 1, duration: 18 },
    { type: "ring", x: "12%", y: "80%", size: 60, delay: 3, duration: 12 },
  ];

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -15, 0],
                  x: [0, 8, 0],
                  rotate: [0, 5, 0],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: s.duration,
                  delay: s.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        >
          {s.type === "circle" ? (
            <div
              className="w-full h-full rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
          ) : (
            <div
              className="w-full h-full rounded-full border-2"
              style={{
                borderColor:
                  "color-mix(in oklch, var(--primary) 35%, transparent)",
                boxShadow:
                  "0 0 30px color-mix(in oklch, var(--primary) 25%, transparent), inset 0 0 30px color-mix(in oklch, var(--primary) 20%, transparent)",
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
