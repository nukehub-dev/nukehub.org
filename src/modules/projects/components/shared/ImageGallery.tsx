"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TiltCard } from "@modules/projects/components/shared/TiltCard";

interface GalleryImage {
  src: string;
  alt: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1 || !isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrent((i) => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length, isAutoPlaying]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    prev();
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    next();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className="relative w-full group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <TiltCard tiltAmount={5}>
          <div className="rounded-xl border border-border/60 overflow-hidden shadow-2xl shadow-primary/5 bg-background">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2.5 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto flex items-center gap-1.5 text-[11px] text-muted-foreground bg-background/60 px-3 py-1 rounded-md border border-border/30">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                localhost:3000
              </div>
              <div className="w-10" />
            </div>

            {/* Image Container */}
            <div className="relative bg-black aspect-video">
              <img
                key={current}
                src={images[current].src}
                alt={images[current].alt}
                className="w-full h-full object-cover"
              />

              {/* Counter */}
              <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                {current + 1} / {images.length}
              </div>
            </div>
          </div>
        </TiltCard>

        {/* Navigation - Hidden on desktop unless hovered */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 transition-all hover:bg-black/70 hover:scale-110 active:scale-95 z-10
                lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity lg:duration-300
                ${isHovered ? "opacity-100" : "opacity-100 lg:opacity-0"}
              `}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 transition-all hover:bg-black/70 hover:scale-110 active:scale-95 z-10
                lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity lg:duration-300
                ${isHovered ? "opacity-100" : "opacity-100 lg:opacity-0"}
              `}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
