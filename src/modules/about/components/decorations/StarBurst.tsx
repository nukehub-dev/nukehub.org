"use client";

import { motion, useReducedMotion } from "framer-motion";

export function StarBurst({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const rays = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    angle: i * 30,
    length: i % 2 === 0 ? 60 : 40,
    delay: i * 0.15,
  }));

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {/* Central glow */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--primary) 20%, transparent) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.5, 0.3],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      />

      {/* Rotating rays container */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={shouldReduceMotion ? undefined : { rotate: 360 }}
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 120,
                repeat: Infinity,
                ease: "linear",
              }
        }
      >
        {rays.map((ray) => (
          <motion.div
            key={ray.id}
            className="absolute left-0 top-0 h-px bg-primary origin-left"
            style={{
              width: ray.length,
              transform: `rotate(${ray.angle}deg)`,
              opacity: 0.08,
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    opacity: [0.05, 0.12, 0.05],
                    width: [ray.length, ray.length + 10, ray.length],
                  }
            }
            transition={
              shouldReduceMotion
                ? undefined
                : {
                    duration: 4,
                    delay: ray.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </motion.div>

      {/* Inner pulse ring */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-primary"
        style={{ opacity: 0.1 }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [1, 1.5, 1],
                opacity: [0.1, 0, 0.1],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 4,
                repeat: Infinity,
                ease: "easeOut",
              }
        }
      />
    </div>
  );
}
