'use client';

import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`h-full ${className}`}
      data-cursor-hover
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl"
        animate={{
          background: isHovering
            ? `radial-gradient(500px circle at ${mousePosition.x}px ${mousePosition.y}px, color-mix(in oklch, var(--primary) 10%, transparent), transparent 40%)`
            : 'radial-gradient(500px circle at 50% 50%, transparent, transparent)',
        }}
        transition={{ duration: 0.25 }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
