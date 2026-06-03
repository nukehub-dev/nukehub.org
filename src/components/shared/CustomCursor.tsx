'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

/*
  Cursor is rendered at 2× size and scaled down with CSS.
  This eliminates sub-pixel border artifacts on the circular rings,
  giving perfectly smooth, retina-crisp edges.
*/
const R = 0.5; // scale factor

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  /* Fast spring for the main cursor */
  const cursorX = useSpring(-100, { stiffness: 500, damping: 28 });
  const cursorY = useSpring(-100, { stiffness: 500, damping: 28 });

  /* Slow spring for the trailing ring – creates fluid depth */
  const trailX = useSpring(cursorX, { stiffness: 60, damping: 16, mass: 0.8 });
  const trailY = useSpring(cursorY, { stiffness: 60, damping: 16, mass: 0.8 });

  useEffect(() => {
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!hasFinePointer || prefersReducedMotion) return;

    setIsVisible(true);
    document.body.classList.add('custom-cursor-active');

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('a, button, [role="button"], input, textarea, select, [data-cursor-hover], .cursor-pointer')
      ) {
        setIsHovering(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('a, button, [role="button"], input, textarea, select, [data-cursor-hover], .cursor-pointer')
      ) {
        setIsHovering(false);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => {
      cursorX.set(-100);
      cursorY.set(-100);
    };

    window.addEventListener('mousemove', moveCursor);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.classList.remove('custom-cursor-active');
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <>
      {/* ── Trail ring (back layer) ── */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block"
        style={{
          x: trailX,
          y: trailY,
          translateX: '-50%',
          translateY: '-50%',
          mixBlendMode: 'difference',
          willChange: 'transform',
        }}
      >
        {/* 2× render + scale down = crisp anti-aliased edges */}
        <div style={{ transform: `scale(${R})`, transformOrigin: 'center center' }}>
          <motion.div
            className="rounded-full"
            style={{ border: '2px solid white' }}
            animate={{
              width: isHovering ? 144 : 104,
              height: isHovering ? 144 : 104,
              opacity: isClicking ? 0.06 : 0.12,
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.6 }}
          />
        </div>
      </motion.div>

      {/* ── Main cursor (front layer) ── */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000] hidden md:block"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
          mixBlendMode: 'difference',
          willChange: 'transform',
        }}
      >
        <div style={{ transform: `scale(${R})`, transformOrigin: 'center center' }}>
          {/* Soft radial glow – creates ambient depth */}
          <motion.div
            className="rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)',
            }}
            animate={{
              width: isHovering ? 176 : 128,
              height: isHovering ? 176 : 128,
              opacity: isClicking ? 0.25 : isHovering ? 0.55 : 0.4,
            }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.5 }}
          />

          {/* Primary 3D glass ring */}
          <motion.div
            className="rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              border: '3px solid rgba(255,255,255,0.9)',
              boxShadow:
                '0 0 0 2px rgba(255,255,255,0.12), ' +
                '0 0 48px 6px rgba(255,255,255,0.15), ' +
                'inset 0 0 24px rgba(255,255,255,0.08)',
            }}
            animate={{
              width: isHovering ? 96 : 64,
              height: isHovering ? 96 : 64,
              opacity: isClicking ? 0.5 : 0.9,
            }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.5 }}
          />

          {/* Inner precision ring */}
          <motion.div
            className="rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ border: '2px solid rgba(255,255,255,0.55)' }}
            animate={{
              width: isHovering ? 40 : 28,
              height: isHovering ? 40 : 28,
              opacity: isClicking ? 0.5 : 0.85,
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.5 }}
          />

          {/* Glowing core dot */}
          <motion.div
            className="rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              boxShadow:
                '0 0 16px 6px rgba(255,255,255,0.55), ' +
                '0 0 36px 14px rgba(255,255,255,0.28)',
            }}
            animate={{
              width: isClicking ? 8 : isHovering ? 4 : 8,
              height: isClicking ? 8 : isHovering ? 4 : 8,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, mass: 0.5 }}
          />
        </div>
      </motion.div>
    </>
  );
}
