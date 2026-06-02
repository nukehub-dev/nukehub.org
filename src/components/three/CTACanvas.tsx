import { Suspense, lazy, useEffect, useState } from 'react';
import { useCanvasVisibility } from './useCanvasVisibility';

const AtomicOrbitalsScene = lazy(() =>
  import('./AtomicOrbitals').then((mod) => ({ default: mod.AtomicOrbitalsScene }))
);

export function CTACanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const isVisible = useCanvasVisibility('cta-canvas-anchor');

  useEffect(() => {
    const anchor = document.getElementById('cta-canvas-anchor');
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
  }, []);

  return (
    <div className="absolute inset-0" id="cta-canvas-anchor">
      {hasLoaded && (
        <Suspense fallback={null}>
          <div className="absolute inset-0">
            <AtomicOrbitalsScene isVisible={isVisible} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
