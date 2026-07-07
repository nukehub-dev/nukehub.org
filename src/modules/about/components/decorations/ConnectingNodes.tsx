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

interface Node {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function ConnectingNodes({ className = "" }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const nodes = useMemo(() => {
    const rand = mulberry32(123);
    return Array.from({ length: 10 }).map((_, i) => ({
      id: i,
      x: rand() * 90 + 5,
      y: rand() * 90 + 5,
      size: rand() * 2 + 1.5,
      duration: rand() * 6 + 8,
      delay: rand() * -10,
    }));
  }, []);

  // Create connections between nearby nodes
  const connections = useMemo(() => {
    const conns: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      opacity: number;
    }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 35) {
          conns.push({
            x1: nodes[i].x,
            y1: nodes[i].y,
            x2: nodes[j].x,
            y2: nodes[j].y,
            opacity: Math.max(0.03, 0.12 - dist * 0.003),
          });
        }
      }
    }
    return conns;
  }, [nodes]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <svg className="w-full h-full">
        {connections.map((conn, i) => (
          <line
            key={`line-${i}`}
            x1={`${conn.x1}%`}
            y1={`${conn.y1}%`}
            x2={`${conn.x2}%`}
            y2={`${conn.y2}%`}
            stroke="currentColor"
            className="text-primary"
            strokeWidth="0.5"
            strokeDasharray="3 3"
            style={{ opacity: conn.opacity }}
          />
        ))}
        {nodes.map((node) => (
          <motion.circle
            key={node.id}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size}
            fill="currentColor"
            className="text-primary"
            style={{ opacity: 0.2 }}
            initial={{ opacity: 0.15 }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    opacity: [0.15, 0.35, 0.15],
                    r: [node.size, node.size * 1.3, node.size],
                  }
            }
            transition={
              shouldReduceMotion
                ? undefined
                : {
                    duration: node.duration,
                    delay: node.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </svg>
    </div>
  );
}
