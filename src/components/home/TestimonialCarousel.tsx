'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TestimonialsData } from '../../types/homepage';

interface TestimonialCarouselProps {
  testimonials: TestimonialsData['testimonials'];
}

/* ------------------------------------------------------------------ */
// 3D position values for each card based on offset from active index
/* ------------------------------------------------------------------ */
function getCardTransform(offset: number) {
  const absOffset = Math.abs(offset);

  if (absOffset > 2) {
    return {
      x: offset > 0 ? 700 : -700,
      rotateY: offset > 0 ? -50 : 50,
      scale: 0.5,
      opacity: 0,
      zIndex: 0,
    };
  }

  if (offset === 0) {
    return { x: 0, rotateY: 0, scale: 1, opacity: 1, zIndex: 10 };
  }

  const dir = offset > 0 ? 1 : -1;
  return {
    x: dir * (240 + (absOffset - 1) * 180),
    rotateY: dir * -32 * absOffset,
    scale: 1 - absOffset * 0.14,
    opacity: 1 - absOffset * 0.4,
    zIndex: 5 - absOffset,
  };
}

/* ------------------------------------------------------------------ */
// Single card
/* ------------------------------------------------------------------ */
function CarouselCard({
  testimonial,
  offset,
  onClick,
}: {
  testimonial: TestimonialsData['testimonials'][0];
  offset: number;
  onClick: () => void;
}) {
  const isActive = offset === 0;
  const t = getCardTransform(offset);

  return (
    <div
      onClick={onClick}
      className="absolute left-1/2 top-1/2 w-[320px] cursor-pointer sm:w-[400px]"
      style={{
        marginLeft: '-160px',
        marginTop: '-200px',
        zIndex: t.zIndex,
        transform: `translateX(${t.x}px) rotateY(${t.rotateY}deg) scale(${t.scale})`,
        opacity: t.opacity,
        transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.55s ease',
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity',
        pointerEvents: t.opacity > 0.3 ? 'auto' : 'none',
      }}
    >
      <div
        className={`relative flex h-[400px] flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-500 ${
          isActive
            ? 'border-border/60 bg-card/70 shadow-2xl shadow-primary/[0.06]'
            : 'border-border/30 bg-card/40 shadow-lg'
        }`}
      >
        {/* Top edge highlight */}
        <div
          className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-opacity duration-500 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Quote watermark */}
        <span className="pointer-events-none absolute right-2 top-1 select-none text-[5rem] font-extrabold leading-none text-foreground/[0.02] sm:text-[6rem]">
          &ldquo;
        </span>

        <div className="flex flex-1 flex-col p-6 sm:p-8">
          {/* Quote icon */}
          <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/15">
            <Quote className="h-4 w-4" strokeWidth={1.5} />
          </div>

          {/* Quote text */}
          <p className="mb-auto flex-1 text-sm leading-relaxed text-foreground/85 sm:text-base/[1.7]">
            {testimonial.quote}
          </p>

          {/* Author */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.08] text-xs font-bold text-primary">
              {testimonial.avatar}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{testimonial.author}</div>
              <div className="truncate text-xs text-muted-foreground">{testimonial.role}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Carousel
/* ------------------------------------------------------------------ */
export function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef(0);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex((index + testimonials.length) % testimonials.length);
    },
    [testimonials.length]
  );

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(autoPlayRef.current);
  }, [isAutoPlaying, testimonials.length]);

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
  };

  return (
    <div
      className="relative mx-auto w-full max-w-5xl select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Stage */}
      <div
        className="relative mx-auto h-[440px] sm:h-[460px]"
        style={{ perspective: '1400px' }}
      >
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {testimonials.map((t, i) => {
            const offset = i - activeIndex;
            return (
              <CarouselCard
                key={t.author}
                testimonial={t}
                offset={offset}
                onClick={() => goTo(i)}
              />
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/40 bg-background/60 p-2.5 text-muted-foreground backdrop-blur-md transition-all hover:border-primary/30 hover:text-primary sm:left-0"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/40 bg-background/60 p-2.5 text-muted-foreground backdrop-blur-md transition-all hover:border-primary/30 hover:text-primary sm:right-0"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-2">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'w-6 bg-primary'
                : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
