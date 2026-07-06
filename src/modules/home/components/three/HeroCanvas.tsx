import { Suspense, lazy, useEffect, useState } from "react";
import { getPrimaryColor } from "@lib/themeColors";
import { useWebGL } from "@lib/useWebGL";
import { useCanvasVisibility, useDelayedUnmount } from "./useCanvasVisibility";

const NucleusScene = lazy(() =>
  import("./NucleusScene").then((mod) => ({ default: mod.NucleusScene })),
);

export function StaticFallback() {
  const [primary, setPrimary] = useState("#f37524");

  useEffect(() => {
    setPrimary(getPrimaryColor());

    const observer = new MutationObserver(() => {
      setPrimary(getPrimaryColor());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-accent", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Primary radial glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export function HeroCanvas() {
  const [reducedMotion, setReducedMotion] = useState(false);
  // Default to mobile so the heavy Three.js chunk is not requested on phones.
  // The check is confirmed client-side after hydration.
  const [isMobile, setIsMobile] = useState(true);
  // Hero is above the fold — render immediately without lazy-loading
  const [hasLoaded] = useState(true);
  const isVisible = useCanvasVisibility("hero-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 0);
  const webglSupported = useWebGL();

  useEffect(() => {
    // Check prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const handleChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mq.addEventListener("change", handleChange);

    // Check mobile (reduce particles)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });

    return () => {
      mq.removeEventListener("change", handleChange);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // If reduced motion, no WebGL, or mobile, show static fallback.
  // Mobile CPUs struggle with the Three.js scene, so we skip it entirely.
  if (reducedMotion || !webglSupported || isMobile) {
    return <StaticFallback />;
  }

  return (
    <div className="absolute inset-0" id="hero-canvas-anchor">
      <StaticFallback />
      {hasLoaded && shouldRender && (
        <div className="absolute inset-0 animate-fade-in">
          <Suspense fallback={null}>
            <NucleusScene
              mobile={isMobile}
              reducedMotion={reducedMotion}
              frameloop="always"
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
