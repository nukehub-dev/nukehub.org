"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function FloatingParticles({
  className = "",
  count = 20,
}: {
  className?: string;
  count?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  const particles = useMemo(() => {
    const rand = mulberry32(77);
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 3 + 1,
      duration: rand() * 10 + 15,
      delay: rand() * -20,
      opacity: rand() * 0.3 + 0.1,
    }));
  }, [count]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -30, 0],
                  x: [0, 10, 0],
                  opacity: [p.opacity, p.opacity * 2, p.opacity],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}
