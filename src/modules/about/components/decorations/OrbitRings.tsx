"use client";

import { motion, useReducedMotion } from "framer-motion";

export function OrbitRings({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const rings = [
    { size: 300, duration: 30, delay: 0, opacity: 0.08, strokeWidth: 1 },
    { size: 420, duration: 45, delay: 2, opacity: 0.06, strokeWidth: 0.8 },
    { size: 540, duration: 60, delay: 4, opacity: 0.05, strokeWidth: 0.6 },
  ];

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {rings.map((ring, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-primary"
            style={{
              width: ring.size,
              height: ring.size,
              left: -ring.size / 2,
              top: -ring.size / 2,
              opacity: ring.opacity,
              borderWidth: ring.strokeWidth,
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    rotate: [0, 360],
                  }
            }
            transition={
              shouldReduceMotion
                ? undefined
                : {
                    duration: ring.duration,
                    delay: ring.delay,
                    repeat: Infinity,
                    ease: "linear",
                  }
            }
          >
            {/* Orbiting dot */}
            <motion.div
              className="absolute w-1.5 h-1.5 rounded-full bg-primary"
              style={{
                top: -3,
                left: "50%",
                marginLeft: -3,
              }}
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.5, 1],
                      opacity: [0.4, 0.8, 0.4],
                    }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
            />
          </motion.div>
        ))}

        {/* Center glow */}
        <div
          className="absolute w-32 h-32 rounded-full -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 opacity-10"
          style={{
            background:
              "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
      </div>
    </div>
  );
}
