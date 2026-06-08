'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || document.readyState === 'complete') {
      setIsLoading(false);
      return;
    }

    const onLoad = () => {
      // Minimum splash duration so the loader doesn't flash in/out
      setTimeout(() => setIsLoading(false), 250);
    };

    window.addEventListener('load', onLoad);
    // Fallback if load already fired or stalls
    const timer = setTimeout(onLoad, 1200);
    return () => {
      window.removeEventListener('load', onLoad);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-background"
        >
          <div className="flex flex-col items-center gap-5">
            {/* Animated atom-like spinner */}
            <div className="relative h-14 w-14">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-primary/40"
                animate={{ scale: [1.15, 1, 1.15], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-[2px] w-24 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
