"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  strength?: number;
  target?: string;
  rel?: string;
}

export function MagneticButton({
  children,
  className = "",
  href,
  onClick,
  strength = 0.35,
  target,
  rel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
      data-cursor-hover
    >
      <motion.div
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      >
        {href ? (
          <a href={href} target={target} rel={rel} className={className}>
            {children}
          </a>
        ) : (
          <button onClick={onClick} className={className}>
            {children}
          </button>
        )}
      </motion.div>
    </div>
  );
}
