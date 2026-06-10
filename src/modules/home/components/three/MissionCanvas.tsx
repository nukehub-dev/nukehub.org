import { Suspense, lazy, useEffect, useState } from "react";
import { getPrimaryColor } from "@lib/themeColors";
import { useWebGL } from "@lib/useWebGL";
import { useCanvasVisibility, useDelayedUnmount } from "./useCanvasVisibility";

const ReactorCoreScene = lazy(() =>
  import("./ReactorCore").then((mod) => ({ default: mod.ReactorCoreScene })),
);

function StaticFallback() {
  const [primary, setPrimary] = useState("#f37524");

  useEffect(() => {
    setPrimary(getPrimaryColor());
    const observer = new MutationObserver(() => setPrimary(getPrimaryColor()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-accent", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/3 top-1/3 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-2/3 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-2/3 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.03]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

export function MissionCanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isVisible = useCanvasVisibility("mission-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 3000);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mq.addEventListener("change", handleChange);

    const anchor = document.getElementById("mission-canvas-anchor");
    if (anchor) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasLoaded(true);
            observer.disconnect();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(anchor);
    } else {
      setHasLoaded(true);
    }

    return () => {
      mq.removeEventListener("change", handleChange);
    };
  }, []);

  if (reducedMotion || !useWebGL()) return <StaticFallback />;

  return (
    <div className="absolute inset-0" id="mission-canvas-anchor">
      <StaticFallback />
      {hasLoaded && shouldRender && (
        <Suspense fallback={null}>
          <div className="absolute inset-0 animate-fade-in">
            <ReactorCoreScene isVisible={isVisible} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
