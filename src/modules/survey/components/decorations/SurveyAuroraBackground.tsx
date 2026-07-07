"use client";

import { motion, useReducedMotion } from "framer-motion";

export function SurveyAuroraBackground({
  className = "",
}: {
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const orbs = [
    {
      x: "15%",
      y: "25%",
      size: 280,
      opacity: 0.07,
      duration: 20,
      delay: 0,
    },
    {
      x: "75%",
      y: "55%",
      size: 320,
      opacity: 0.05,
      duration: 24,
      delay: 3,
    },
    {
      x: "45%",
      y: "85%",
      size: 240,
      opacity: 0.06,
      duration: 18,
      delay: 1.5,
    },
  ];

  const rings = [
    { x: "10%", y: "70%", size: 120, duration: 28, delay: 0 },
    { x: "85%", y: "15%", size: 90, duration: 22, delay: 4 },
  ];

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Animated gradient orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, color-mix(in oklch, var(--primary) 85%, transparent) 0%, transparent 65%)`,
            opacity: orb.opacity,
            filter: "blur(60px)",
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 30, 0, -20, 0],
                  y: [0, -20, 15, -10, 0],
                  scale: [1, 1.08, 1, 0.95, 1],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: orb.duration,
                  delay: orb.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}

      {/* Subtle floating rings */}
      {rings.map((ring, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute rounded-full border"
          style={{
            left: ring.x,
            top: ring.y,
            width: ring.size,
            height: ring.size,
            borderColor: "color-mix(in oklch, var(--primary) 22%, transparent)",
            boxShadow:
              "0 0 40px color-mix(in oklch, var(--primary) 12%, transparent), inset 0 0 40px color-mix(in oklch, var(--primary) 8%, transparent)",
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -12, 0],
                  x: [0, 8, 0],
                  rotate: [0, 8, 0],
                  opacity: [0.3, 0.5, 0.3],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: ring.duration,
                  delay: ring.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}
