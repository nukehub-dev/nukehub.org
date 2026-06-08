import { lazy, Suspense, useEffect, useState } from 'react';
import { getPrimaryColor } from '@lib/themeColors';
import { DebugCanvasShell } from '../DebugCanvasShell';

const NucleusScene = lazy(() =>
  import('@modules/home/components/three/NucleusScene').then((mod) => ({ default: mod.NucleusScene }))
);

export function HeroDebug() {
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [primary, setPrimary] = useState('#f37524');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });

    setPrimary(getPrimaryColor());
    const observer = new MutationObserver(() => {
      setPrimary(getPrimaryColor());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, []);

  const hud = (
    <>
      <p className="font-semibold text-primary">Reactor Lattice Scene — Debug Mode</p>
      <p className="text-muted-foreground">Left drag → rotate | Right drag → pan | Scroll → zoom</p>
      <p className="text-muted-foreground">
        Mobile: {isMobile ? 'yes (reduced particles)' : 'no (full quality)'}
      </p>
    </>
  );

  return (
    <div className="relative h-screen w-full bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
        />
      </div>

      <DebugCanvasShell hud={hud}>
        {isVisible && (
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            }
          >
            <NucleusScene mobile={isMobile} reducedMotion={false} orbitControls={true} />
          </Suspense>
        )}
      </DebugCanvasShell>
    </div>
  );
}
