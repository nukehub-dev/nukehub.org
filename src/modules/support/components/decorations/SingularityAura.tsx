"use client";

import { motion, useReducedMotion } from "framer-motion";

export function SingularityAura({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-8 blur-[100px] dark:opacity-4"
        style={{
          background:
            "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
        }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [1, 1.2, 1],
                opacity: [0.05, 0.1, 0.05],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      />
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-4 blur-[80px] dark:opacity-2"
        style={{
          background:
            "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
        }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [1, 1.1, 1],
                opacity: [0.02, 0.05, 0.02],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }
        }
      />
    </div>
  );
}
