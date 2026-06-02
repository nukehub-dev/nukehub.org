import { useEffect, useState, Suspense } from 'react';
import { getPrimaryColor } from '@lib/themeColors';
import { NebulaScene } from './NebulaScene';

export function TestimonialsDebug() {
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
    <div className="relative h-screen w-full bg-background">
      {/* Three.js Canvas */}
      <Suspense
        fallback={
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        }
      >
        <div className="absolute inset-0">
          <NebulaScene isVisible={true} />
        </div>
      </Suspense>

      {/* Debug HUD */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 space-y-1.5 font-mono text-xs">
        <p className="font-semibold text-primary">Nebula Background — Debug Mode</p>
        <p className="text-muted-foreground">
          Theme: {isLight ? 'light' : 'dark'} | Accent: {primary}
        </p>
        <p className="text-muted-foreground">
          Technique: Full-screen shader with FBM domain warp
        </p>
      </div>

      {/* Top-right info badge */}
      <div className="pointer-events-none absolute top-6 right-6 z-10">
        <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground backdrop-blur-sm">
          <p>Used in: TestimonialsSection</p>
          <p>Respects: data-theme (light/dark)</p>
        </div>
      </div>
    </div>
  );
}
