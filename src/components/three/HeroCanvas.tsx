import { Suspense, lazy, useEffect, useState } from 'react';
import { getPrimaryColor } from '@lib/themeColors';
import { useCanvasVisibility } from './useCanvasVisibility';

const NucleusScene = lazy(() =>
  import('./NucleusScene').then((mod) => ({ default: mod.NucleusScene }))
);

function StaticFallback() {
  const [primary, setPrimary] = useState('#f37524');

  useEffect(() => {
    setPrimary(getPrimaryColor());

    const observer = new MutationObserver(() => {
      setPrimary(getPrimaryColor());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Primary radial glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  );
}

export function HeroCanvas() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const isVisible = useCanvasVisibility('hero-canvas-anchor');

  useEffect(() => {
    // Check prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleChange);

    // Check mobile (reduce particles)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });

    // Trigger lazy load once when hero is near viewport
    const hero = document.getElementById('hero-canvas-anchor');
    if (hero) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasLoaded(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );
      observer.observe(hero);
    } else {
      setHasLoaded(true);
    }

    return () => {
      mq.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // If reduced motion, always show static fallback
  if (reducedMotion) {
    return <StaticFallback />;
  }

  return (
    <div className="absolute inset-0" id="hero-canvas-anchor">
      <StaticFallback />
      {hasLoaded && (
        <Suspense fallback={<CanvasLoader />}>
          <div className="absolute inset-0">
            <NucleusScene
              mobile={isMobile}
              reducedMotion={reducedMotion}
              frameloop={isVisible ? 'always' : 'never'}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
