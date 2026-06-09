'use client';

import { useState, useEffect } from 'react';

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || document.readyState === 'complete') {
      setIsFading(true);
      setTimeout(() => setIsLoading(false), 300);
      return;
    }

    const onLoad = () => {
      setTimeout(() => {
        setIsFading(true);
        setTimeout(() => setIsLoading(false), 300);
      }, 150);
    };

    window.addEventListener('load', onLoad);
    const timer = setTimeout(onLoad, 1200);
    return () => {
      window.removeEventListener('load', onLoad);
      clearTimeout(timer);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-[10001] flex items-center justify-center bg-background transition-opacity duration-300 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden={isFading ? 'true' : 'false'}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Animated atom-like spinner */}
        <div className="relative h-14 w-14">
          <span className="absolute inset-0 animate-pulse-scale rounded-full border-2 border-primary/20" />
          <span className="absolute inset-2 animate-pulse-scale-reverse rounded-full border-2 border-primary/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-primary" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full animate-progress-bar bg-primary" />
        </div>
      </div>
    </div>
  );
}
