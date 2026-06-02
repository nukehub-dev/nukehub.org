import { Suspense, lazy, useEffect, useState } from 'react';
import { getPrimaryColor } from '@lib/themeColors';
import { useCanvasVisibility } from './useCanvasVisibility';

const TokamakScene = lazy(() =>
  import('./TokamakScene').then((mod) => ({ default: mod.TokamakScene }))
);

function StaticFallback() {
  const [primary, setPrimary] = useState('#f37524');

  useEffect(() => {
    setPrimary(getPrimaryColor());
    const observer = new MutationObserver(() => setPrimary(getPrimaryColor()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
        style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
      />
    </div>
  );
}

export function TokamakCanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isVisible = useCanvasVisibility('tech-canvas-anchor');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleChange);

    // Check mobile (reduce geometry complexity)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });

    const anchor = document.getElementById('tech-canvas-anchor');
    if (anchor) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasLoaded(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );
      observer.observe(anchor);
    } else {
      setHasLoaded(true);
    }

    return () => {
      mq.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  if (reducedMotion) return <StaticFallback />;

  return (
    <div className="absolute inset-0" id="tech-canvas-anchor">
      <StaticFallback />
      {hasLoaded && (
        <Suspense fallback={null}>
          <div className="absolute inset-0">
            <TokamakScene isVisible={isVisible} mobile={isMobile} reducedMotion={reducedMotion} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
