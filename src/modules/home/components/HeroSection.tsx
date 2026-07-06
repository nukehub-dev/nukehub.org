import { Suspense, lazy, useEffect, useState } from "react";
import { HeroStatCard } from "./HeroStatCard";
import { getIcon } from "@lib/icons";
import type { HeroData } from "@modules/home/types";

const HeroCanvas = lazy(() =>
  import("@modules/home/components/three/HeroCanvas").then((mod) => ({
    default: mod.HeroCanvas,
  })),
);

interface HeroSectionProps {
  data: HeroData;
}

function useDeferHeroCanvas() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const useIdleCallback = typeof window.requestIdleCallback === "function";
    const handle = useIdleCallback
      ? window.requestIdleCallback(() => setShow(true), { timeout: 500 })
      : window.setTimeout(() => setShow(true), 200);

    return () => {
      if (useIdleCallback) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, []);

  return show;
}

export function HeroSection({ data }: HeroSectionProps) {
  const { badge, headline, subtitle, ctas, stats } = data;
  const showCanvas = useDeferHeroCanvas();

  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden px-4 snap-section">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 -z-20 opacity-[0.28] dark:opacity-100 transition-opacity duration-700">
        {showCanvas && (
          <Suspense fallback={null}>
            <HeroCanvas />
          </Suspense>
        )}
      </div>

      {/* Top fade */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-transparent to-transparent" />

      {/* Bottom fade for text readability */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Main Content */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pt-24 pb-8 sm:pt-28 sm:pb-12 lg:pt-32">
        <div className="flex w-full flex-col items-center text-center">
          {/* Badge */}
          <span
            className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md sm:mb-8"
            style={{ animationDelay: "0.1s" }}
          >
            {badge.showLiveDot && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
            {badge.text}
          </span>

          {/* Headline */}
          <h1 className="perspective-text max-w-5xl text-5xl font-extrabold tracking-tighter text-foreground sm:text-6xl md:text-6xl lg:text-7xl xl:text-8xl">
            <span className="block">
              <span className="inline-block">{headline.line1.prefix}</span>{" "}
              <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_60%,var(--foreground))] bg-clip-text text-transparent inline-block">
                {headline.line1.highlight}
              </span>
            </span>
            <span className="block mt-1 sm:mt-2">{headline.line2}</span>
          </h1>

          {/* Subtitle */}
          <p
            className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:mt-8 sm:text-xl animate-fade-in-up"
            style={{ animationDelay: "0.5s" }}
          >
            {subtitle}
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:mt-10 animate-fade-in-up"
            style={{ animationDelay: "0.65s" }}
          >
            {ctas.map((cta, i) => {
              const CtaIcon = cta.icon ? getIcon(cta.icon) : null;
              const isPrimary = cta.variant === "primary";
              return (
                <a
                  key={i}
                  href={cta.href}
                  className={`group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${
                    isPrimary
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                      : "border border-input bg-background/60 text-foreground backdrop-blur-md hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5"
                  }`}
                >
                  {cta.text}
                  {CtaIcon && (
                    <CtaIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  )}
                </a>
              );
            })}
          </div>

          {/* Scroll Indicator */}
          <div
            className="mt-12 animate-fade-in-up"
            style={{ animationDelay: "1.2s" }}
          >
            <button
              onClick={() => {
                const nextSection = document.querySelector(
                  ".snap-section:nth-of-type(2)",
                );
                nextSection?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
              aria-label="Scroll down to explore more"
            >
              <span className="text-xs font-medium tracking-wider uppercase opacity-70 group-hover:opacity-100 transition-opacity">
                Scroll to explore
              </span>
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-current/20 bg-background/50 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:border-primary/40">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-bounce"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </span>
            </button>
          </div>

          {/* Stats Row */}
          <div
            className="mt-8 w-full max-w-3xl sm:mt-10 animate-fade-in-up"
            style={{ animationDelay: "0.8s" }}
          >
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {stats.map((stat, i) => (
                <HeroStatCard
                  key={stat.label}
                  iconName={stat.icon}
                  value={stat.value}
                  numericValue={stat.numericValue}
                  label={stat.label}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
