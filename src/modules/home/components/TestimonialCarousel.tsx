'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
}

/* ------------------------------------------------------------------ */
// Position values — translateX + scale only (no rotateY so blur works)
/* ------------------------------------------------------------------ */
function getCardTransform(offset: number, isMobile = false) {
  const absOffset = Math.abs(offset);

  if (absOffset > 2) {
    return {
      x: offset > 0 ? 700 : -700,
      scale: 0.5,
      opacity: 0,
      zIndex: 0,
    };
  }

  if (offset === 0) {
    return { x: 0, scale: 1, opacity: 1, zIndex: 10 };
  }

  const dir = offset > 0 ? 1 : -1;
  const baseX = isMobile ? 170 : 240;
  const stepX = isMobile ? 120 : 180;
  return {
    x: dir * (baseX + (absOffset - 1) * stepX),
    scale: 1 - absOffset * 0.14,
    opacity: 1 - absOffset * 0.4,
    zIndex: 5 - absOffset,
  };
}

/* ------------------------------------------------------------------ */
// Single card with strong glassmorphism
/* ------------------------------------------------------------------ */
function CarouselCard({
  testimonial,
  offset,
  onClick,
  isMobile,
}: {
  testimonial: Testimonial;
  offset: number;
  onClick: () => void;
  isMobile: boolean;
}) {
  const isActive = offset === 0;
  const t = getCardTransform(offset, isMobile);

  return (
    <div
      onClick={onClick}
      className={`bubble absolute left-1/2 top-1/2 -ml-[42.5vw] -mt-[190px] w-[85vw] cursor-pointer overflow-hidden rounded-2xl border transition-all duration-500 sm:w-[400px] sm:-ml-[200px] sm:-mt-[200px] ${
        isActive
          ? 'border-border/60 shadow-2xl shadow-primary/[0.08]'
          : 'border-border/20 shadow-lg'
      }`}
      style={{
        zIndex: t.zIndex,
        transform: `translateX(${t.x}px) scale(${t.scale})`,
        opacity: t.opacity,
        transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.55s ease',
        willChange: 'transform, opacity',
        pointerEvents: t.opacity > 0.3 ? 'auto' : 'none',
        height: isMobile ? '380px' : '400px',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        backgroundColor: 'color-mix(in oklch, var(--glass-base, var(--bg-surface)) 35%, transparent)',
      }}
    >
      {/* Content */}
      <div className="relative flex h-full flex-col p-6 sm:p-8">
        {/* Quote icon */}
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Quote className="h-5 w-5" strokeWidth={1.5} />
        </div>

        {/* Quote text */}
        <p className="mb-auto flex-1 text-sm leading-relaxed text-foreground/90 sm:text-base/[1.7]">
          {testimonial.quote}
        </p>

        {/* Divider */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
            {testimonial.avatar}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{testimonial.author}</div>
            <div className="truncate text-xs text-muted-foreground">{testimonial.role}</div>
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
  const [isMobile, setIsMobile] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const touchStartX = useRef(0);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
      {/* Stage */}
      <div className="relative mx-auto h-[420px] sm:h-[460px]">
        <div className="absolute inset-0">
          {testimonials.map((t, i) => {
            const offset = i - activeIndex;
            return (
              <CarouselCard
                key={t.author}
                testimonial={t}
                offset={offset}
                onClick={() => goTo(i)}
                isMobile={isMobile}
              />
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-border/40 bg-background/60 p-2.5 text-muted-foreground backdrop-blur-md transition-all hover:border-primary/30 hover:text-primary sm:block sm:left-4 lg:-left-24 xl:-left-40"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-border/40 bg-background/60 p-2.5 text-muted-foreground backdrop-blur-md transition-all hover:border-primary/30 hover:text-primary sm:block sm:right-4 lg:-right-24 xl:-right-40"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Pagination dots — min 24x24 touch target with visible indicator inside */}
      <div className="flex items-center justify-center gap-1">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full"
            aria-label={`Go to testimonial ${i + 1}`}
          >
            <span
              className={`block h-2 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
