import { Suspense, lazy, useEffect, useState } from "react";
import { getPrimaryColor } from "@lib/themeColors";
import { useWebGL } from "@lib/useWebGL";
import { useCanvasVisibility, useDelayedUnmount } from "./useCanvasVisibility";

const MilkyWayScene = lazy(() =>
  import("./MilkyWayScene").then((mod) => ({ default: mod.MilkyWayScene })),
);

function StaticFallback() {
  const [primary, setPrimary] = useState("#f37524");
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const update = () => {
      setPrimary(getPrimaryColor());
      setIsLight(
        document.documentElement.getAttribute("data-theme") === "light",
      );
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-accent", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={
        "absolute inset-0 overflow-hidden " + (isLight ? "bg-background" : "")
      }
    >
      <div
        className="absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.03]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

export function InstitutionsCanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isVisible = useCanvasVisibility("institutions-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 3000);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mq.addEventListener("change", handleChange);

    const anchor = document.getElementById("institutions-canvas-anchor");
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

    return () => mq.removeEventListener("change", handleChange);
  }, []);

  if (reducedMotion || !useWebGL()) return <StaticFallback />;

  return (
    <div className="absolute inset-0" id="institutions-canvas-anchor">
      <StaticFallback />
      {hasLoaded && shouldRender && (
        <Suspense fallback={null}>
          <div className="absolute inset-0 animate-fade-in">
            <MilkyWayScene isVisible={isVisible} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
