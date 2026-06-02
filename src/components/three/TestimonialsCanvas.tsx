import { Suspense, lazy, useEffect, useState } from 'react';
import { getPrimaryColor } from '@lib/themeColors';
import { useCanvasVisibility } from './useCanvasVisibility';

const NebulaScene = lazy(() =>
  import('./NebulaScene').then((mod) => ({ default: mod.NebulaScene }))
);

function StaticFallback() {
  const [primary, setPrimary] = useState('#f37524');
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const update = () => {
      setPrimary(getPrimaryColor());
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={"absolute inset-0 overflow-hidden " + (isLight ? 'bg-background' : '')}>
      <div
        className="absolute left-1/2 top-1/3 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
        style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
      />
      <div
        className="absolute left-1/3 top-2/3 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.03]"
        style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
      />
    </div>
  );
}

export function TestimonialsCanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isVisible = useCanvasVisibility('testimonials-canvas-anchor');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleChange);

    const anchor = document.getElementById('testimonials-canvas-anchor');
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
    };
  }, []);

  if (reducedMotion) return <StaticFallback />;

  return (
    <div className="absolute inset-0" id="testimonials-canvas-anchor">
      <StaticFallback />
      {hasLoaded && (
        <Suspense fallback={null}>
          <div className="absolute inset-0">
            <NebulaScene isVisible={isVisible} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
