import { Suspense, type ReactNode } from 'react';

interface DebugCanvasShellProps {
  children: ReactNode;
  hud?: ReactNode;
  infoBadge?: ReactNode;
}

export function DebugCanvasShell({ children, hud, infoBadge }: DebugCanvasShellProps) {
  return (
    <div className="relative h-screen w-full bg-background">
      <Suspense
        fallback={
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        }
      >
        <div className="absolute inset-0">{children}</div>
      </Suspense>

      {hud && (
        <div className="pointer-events-none absolute bottom-6 left-6 z-10 space-y-1.5 font-mono text-xs">
          {hud}
        </div>
      )}

      {infoBadge && (
        <div className="pointer-events-none absolute top-6 right-6 z-10">
          <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground backdrop-blur-sm">
            {infoBadge}
          </div>
        </div>
      )}
    </div>
  );
}
