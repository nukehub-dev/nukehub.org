"use client";

import { motion, useReducedMotion } from "framer-motion";

export function GradientOrbs({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const orbs = [
    {
      x: "10%",
      y: "20%",
      size: 180,
      color: "var(--primary)",
      opacity: 0.06,
      duration: 18,
      delay: 0,
    },
    {
      x: "80%",
      y: "60%",
      size: 220,
      color: "var(--primary)",
      opacity: 0.05,
      duration: 22,
      delay: 3,
    },
    {
      x: "50%",
      y: "80%",
      size: 150,
      color: "var(--primary)",
      opacity: 0.04,
      duration: 16,
      delay: 1,
    },
    {
      x: "85%",
      y: "10%",
      size: 120,
      color: "var(--primary)",
      opacity: 0.05,
      duration: 20,
      delay: 2,
    },
  ];

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            opacity: orb.opacity,
            filter: "blur(40px)",
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 20, 0, -20, 0],
                  y: [0, -15, 10, -5, 0],
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
    </div>
  );
}
