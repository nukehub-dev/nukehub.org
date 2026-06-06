import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { getPrimaryColor } from '@lib/themeColors';

const TokamakScene = lazy(() =>
  import('./TokamakScene').then((mod) => ({ default: mod.TokamakScene }))
);

export function TokamakDebug() {
  const [primary, setPrimary] = useState('#f37524');
  const [isLight, setIsLight] = useState(false);
  const [eventReceived, setEventReceived] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrimary(getPrimaryColor());
    const theme = document.documentElement.getAttribute('data-theme');
    setIsLight(theme === 'light');

    const observer = new MutationObserver(() => {
      setPrimary(getPrimaryColor());
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Event probe: detect if pointer events reach the canvas wrapper
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const mark = () => {
      setEventReceived(true);
      // Reset after 2s so user can test again
      setTimeout(() => setEventReceived(false), 2000);
    };

    el.addEventListener('pointerdown', mark);
    el.addEventListener('wheel', mark, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', mark);
      el.removeEventListener('wheel', mark);
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-background">
      {/* Static fallback gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Three.js Canvas */}
      <Suspense
        fallback={
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        }
      >
        <div ref={wrapperRef} className="absolute inset-0">
          <TokamakScene isVisible={true} orbitControls={true} />
        </div>
      </Suspense>

      {/* Debug HUD */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 space-y-1.5 font-mono text-xs">
        <p className="font-semibold text-primary">Tokamak Scene — Debug Mode</p>
        <p className={eventReceived ? 'text-green-500 font-bold' : 'text-muted-foreground'}>
          {eventReceived ? '✓ Events detected!' : 'Left drag → rotate | Right drag → pan | Scroll → zoom'}
        </p>
        <p className="text-muted-foreground">
          Theme: {isLight ? 'light' : 'dark'} | Accent: {primary}
        </p>
      </div>
    </div>
  );
}
