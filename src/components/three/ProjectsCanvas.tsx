import { Suspense, lazy, useEffect, useState } from 'react';
import { getPrimaryColor } from '@lib/themeColors';
import { useCanvasVisibility } from './useCanvasVisibility';

const EmblemsScene = lazy(() =>
  import('./ProjectEmblems').then((mod) => ({ default: mod.EmblemsScene }))
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
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
      />
      <div
        className="absolute left-1/4 top-1/3 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-8"
        style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
      />
      <div
        className="absolute left-3/4 top-2/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-8"
        style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
      />
    </div>
  );
}

export function ProjectsCanvas() {
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const isVisible = useCanvasVisibility('projects-canvas-anchor');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleChange);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });

    const anchor = document.getElementById('projects-canvas-anchor');
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
    <div className="absolute inset-0" id="projects-canvas-anchor">
      <StaticFallback />
      {hasLoaded && (
        <Suspense fallback={null}>
          <div className="absolute inset-0">
            <_ProjectsCanvasInner mobile={isMobile} frameloop={isVisible ? 'always' : 'never'} />
          </div>
        </Suspense>
      )}
    </div>
  );
}

// Inner component to avoid importing Canvas before we're sure we need it
import { Canvas } from '@react-three/fiber';

function _ProjectsCanvasInner({ mobile, frameloop }: { mobile?: boolean; frameloop?: 'always' | 'never' }) {
  return (
    <Canvas
      dpr={[1, Math.min(window.devicePixelRatio, 1.5)]}
      camera={{ position: [0, 0, 7], fov: 45, near: 0.1, far: 50 }}
      frameloop={frameloop}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <EmblemsScene mobile={mobile} />
    </Canvas>
  );
}
