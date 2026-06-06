import { Suspense, lazy, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { getPrimaryColor } from "@lib/themeColors";
import { useCanvasVisibility, useDelayedUnmount } from "./useCanvasVisibility";

const ShowcaseScene = lazy(() =>
  import("./ProjectEmblems").then((mod) => ({ default: mod.ShowcaseScene })),
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
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

export function ProjectsCanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isVisible = useCanvasVisibility("projects-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 3000);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mq.addEventListener("change", handleChange);

    const anchor = document.getElementById("projects-canvas-anchor");
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

  if (reducedMotion) return <StaticFallback />;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      id="projects-canvas-anchor"
    >
      {/* On mobile, keep a wider canvas so the scene isn't squeezed — sides get cropped instead */}
      <div className="absolute inset-y-0 left-1/2 w-[900px] -translate-x-1/2 sm:inset-x-0 sm:left-0 sm:w-full sm:translate-x-0">
        <StaticFallback />
        {hasLoaded && shouldRender && (
          <Suspense fallback={null}>
            <div className="absolute inset-0 animate-fade-in">
              <Canvas
                dpr={[1, 1]}
                camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 50 }}
                frameloop={isVisible ? "always" : "never"}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: "high-performance",
                }}
                style={{ background: "transparent" }}
              >
                <ShowcaseScene visible={isVisible} />
              </Canvas>
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
