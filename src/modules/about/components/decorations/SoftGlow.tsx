"use client";

import { motion, useReducedMotion } from "framer-motion";

export function SoftGlow() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="glow1" cx="30%" cy="30%" r="50%">
            <motion.stop
              offset="0%"
              stopColor="var(--primary)"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      stopOpacity: [0.1, 0.18, 0.1],
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
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow2" cx="70%" cy="70%" r="45%">
            <motion.stop
              offset="0%"
              stopColor="var(--primary)"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      stopOpacity: [0.07, 0.12, 0.07],
                    }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2,
                    }
              }
            />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <motion.circle
          cx="30%"
          cy="30%"
          r="55%"
          fill="url(#glow1)"
          animate={
            shouldReduceMotion
              ? {}
              : {
                  cx: ["30%", "33%", "30%"],
                  cy: ["30%", "27%", "30%"],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
        <motion.circle
          cx="90%"
          cy="80%"
          r="60%"
          fill="url(#glow2)"
          animate={
            shouldReduceMotion
              ? {}
              : {
                  cx: ["90%", "87%", "90%"],
                  cy: ["80%", "83%", "80%"],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }
          }
        />
      </svg>
    </div>
  );
}
