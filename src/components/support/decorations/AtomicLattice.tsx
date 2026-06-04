'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

interface Node {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  offsetX: number;
  offsetY: number;
}

// Seeded pseudo-random generator for SSR/client hydration consistency
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function AtomicLattice({ className = '' }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const nodes = useMemo(() => {
    const rand = mulberry32(42);
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 3 + 2,
      duration: rand() * 8 + 12,
      delay: rand() * -15,
      offsetX: rand() * 30 - 15,
      offsetY: rand() * 30 - 15,
    }));
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg className="w-full h-full opacity-20 dark:opacity-15" xmlns="http://www.w3.org/2000/svg">
        {nodes.map((node, i) => (
          <motion.g
            key={node.id}
            initial={{ opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 0.25 } : {
              opacity: [0.15, 0.35, 0.15],
              x: [0, node.offsetX, 0],
              y: [0, node.offsetY, 0],
            }}
            transition={shouldReduceMotion ? undefined : {
              duration: node.duration,
              repeat: Infinity,
              delay: node.delay,
              ease: 'easeInOut',
            }}
          >
            {nodes.slice(i + 1, i + 2).map((other) => (
              <line
                key={`line-${i}-${other.id}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${other.x}%`}
                y2={`${other.y}%`}
                stroke="currentColor"
                className="text-primary"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                style={{ opacity: 0.15 }}
              />
            ))}
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r={node.size}
              fill="currentColor"
              className="text-primary"
              style={{ opacity: 0.4 }}
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
