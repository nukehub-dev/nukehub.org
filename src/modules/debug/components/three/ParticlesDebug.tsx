import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ShowcaseScene } from '@modules/home/components/three/ProjectEmblems';
import { DebugCanvasShell } from '../DebugCanvasShell';
import { useDebugTheme } from '../../hooks/useDebugTheme';
import { useEventProbe } from '../../hooks/useEventProbe';

export function ParticlesDebug() {
  const { primary, isLight } = useDebugTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { eventReceived } = useEventProbe(wrapperRef);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const hud = (
    <>
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
    </>
  );

  const infoBadge = (
    <>
      <p>Source: nukehub.png</p>
      <p>Technique: InstancedBufferGeometry + Touch Texture</p>
    </>
  );

  return (
    <div className="relative h-screen w-full bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
        />
      </div>

      <DebugCanvasShell hud={hud} infoBadge={infoBadge}>
        <div ref={wrapperRef} className="h-full w-full" onMouseMove={handleMouseMove}>
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
      </DebugCanvasShell>
    </div>
  );
}
