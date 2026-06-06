'use client';

export function AboutBackground() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklch, var(--primary) 6%, transparent), transparent),
          radial-gradient(ellipse 50% 40% at 20% 60%, color-mix(in oklch, var(--primary) 4%, transparent), transparent),
          radial-gradient(ellipse 60% 50% at 80% 80%, color-mix(in oklch, var(--primary) 4%, transparent), transparent)
        `,
      }}
    />
  );
}
