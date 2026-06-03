'use client';

import type { MarqueeData } from '../../types/homepage';

interface MarqueeBandProps {
  data: MarqueeData;
}

function MarqueeRow({ items, reverse = false, speed = 40 }: { items: string[]; reverse?: boolean; speed?: number }) {
  const content = (
    <>
      {items.map((item, i) => (
        <span key={i} className="mx-6 flex items-center gap-6 text-sm font-medium text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          {item}
        </span>
      ))}
    </>
  );

  return (
    <div
      className={`flex w-max will-change-transform ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
      style={{ animationDuration: `${speed}s` }}
    >
      <div className="flex shrink-0">{content}</div>
      <div className="flex shrink-0">{content}</div>
    </div>
  );
}

export function MarqueeBand({ data }: MarqueeBandProps) {
  const { items, speed } = data;

  return (
    <section className="relative overflow-hidden border-y border-border/20 bg-surface/50 py-4 sm:py-5">
      <div className="flex flex-col gap-3">
        <MarqueeRow items={items} speed={speed.row1} />
        <MarqueeRow items={items} reverse speed={speed.row2} />
      </div>
    </section>
  );
}
