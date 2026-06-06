'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function FloatingHexagons({ className = '' }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  const hexagons = [
    { x: '10%', y: '20%', size: 80, delay: 0, duration: 10 },
    { x: '85%', y: '15%', size: 60, delay: 2, duration: 12 },
    { x: '75%', y: '70%', size: 100, delay: 1, duration: 14 },
    { x: '15%', y: '80%', size: 50, delay: 3, duration: 11 },
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {hexagons.map((h, i) => (
        <motion.svg
          key={i}
          width={h.size}
          height={h.size}
          viewBox="0 0 100 100"
          className="absolute text-primary/30"
          style={{ left: h.x, top: h.y }}
          animate={shouldReduceMotion ? undefined : {
            y: [0, -12, 0],
            rotate: [0, 4, 0],
          }}
          transition={shouldReduceMotion ? undefined : {
            duration: h.duration,
            delay: h.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <polygon
            points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <polygon
            points="50,20 78,35 78,65 50,80 22,65 22,35"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.5"
          />
        </motion.svg>
      ))}
    </div>
  );
}
