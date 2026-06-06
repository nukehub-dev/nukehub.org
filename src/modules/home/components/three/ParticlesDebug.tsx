import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getPrimaryColor } from '@lib/themeColors';
import { ShowcaseScene } from './ProjectEmblems';

export function ParticlesDebug() {
  const [primary, setPrimary] = useState('#f37524');
  const [isLight, setIsLight] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
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
      setTimeout(() => setEventReceived(false), 2000);
    };

    const onMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      mark();
    };

    el.addEventListener('pointerdown', mark);
    el.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', mark);
      el.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-background">
      {/* Static fallback gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
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
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 50 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            style={{ background: 'transparent' }}
          >
            <ShowcaseScene />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={false}
              minDistance={2}
              maxDistance={20}
            />
          </Canvas>
        </div>
      </Suspense>

      {/* Debug HUD */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 space-y-1.5 font-mono text-xs">
        <p className="font-semibold text-primary">Interactive Particles — Debug Mode</p>
        <p className={eventReceived ? 'text-green-500 font-bold' : 'text-muted-foreground'}>
          {eventReceived ? '✓ Events detected!' : 'Move mouse to interact | Left drag → rotate | Scroll → zoom'}
        </p>
        <p className="text-muted-foreground">
          Mouse: {mousePos.x.toFixed(0)}, {mousePos.y.toFixed(0)}
        </p>
        <p className="text-muted-foreground">
          Theme: {isLight ? 'light' : 'dark'} | Accent: {primary}
        </p>
      </div>

      {/* Top-right info badge */}
      <div className="pointer-events-none absolute top-6 right-6 z-10">
        <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground backdrop-blur-sm">
          <p>Source: nukehub.png</p>
          <p>Technique: InstancedBufferGeometry + Touch Texture</p>
        </div>
      </div>
    </div>
  );
}
