import { lazy, useRef } from 'react';
import { DebugCanvasShell } from '../DebugCanvasShell';
import { useDebugTheme } from '../../hooks/useDebugTheme';
import { useEventProbe } from '../../hooks/useEventProbe';

const TokamakScene = lazy(() =>
  import('@modules/home/components/three/TokamakScene').then((mod) => ({ default: mod.TokamakScene }))
);

export function TokamakDebug() {
  const { primary, isLight } = useDebugTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { eventReceived } = useEventProbe(wrapperRef);

  const hud = (
    <>
      <p className="font-semibold text-primary">Tokamak Scene — Debug Mode</p>
      <p className={eventReceived ? 'text-green-500 font-bold' : 'text-muted-foreground'}>
        {eventReceived ? '✓ Events detected!' : 'Left drag → rotate | Right drag → pan | Scroll → zoom'}
      </p>
      <p className="text-muted-foreground">
        Theme: {isLight ? 'light' : 'dark'} | Accent: {primary}
      </p>
    </>
  );

  return (
    <div className="relative h-screen w-full bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }}
        />
      </div>

      <DebugCanvasShell hud={hud}>
        <div ref={wrapperRef} className="h-full w-full">
          <TokamakScene isVisible={true} orbitControls={true} />
        </div>
      </DebugCanvasShell>
    </div>
  );
}
