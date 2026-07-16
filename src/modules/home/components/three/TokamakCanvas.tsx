import {
  Suspense,
  lazy,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { getPrimaryColor } from "@lib/themeColors";
import { useWebGL } from "@lib/useWebGL";
import { useCanvasVisibility, useDelayedUnmount } from "./useCanvasVisibility";

const TokamakScene = lazy(() =>
  import("./TokamakScene").then((mod) => ({ default: mod.TokamakScene })),
);

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribePrimaryColor(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-accent", "data-theme"],
  });
  return () => observer.disconnect();
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function StaticFallback() {
  const primary = useSyncExternalStore(
    subscribePrimaryColor,
    getPrimaryColor,
    () => "#f37524",
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

export function TokamakCanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const [isMobile, setIsMobile] = useState(false);
  const isVisible = useCanvasVisibility("tech-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 3000);
  const webglSupported = useWebGL();
  const showFallback = reducedMotion || !webglSupported;

  // Adjust during render: the fallback branch has no anchor to observe,
  // so there is nothing to lazy-load.
  if (showFallback && !hasLoaded) {
    setHasLoaded(true);
  }

  useEffect(() => {
    // Check mobile (reduce geometry complexity)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });

    const anchor = document.getElementById("tech-canvas-anchor");
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
    }

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  if (showFallback) return <StaticFallback />;

  return (
    <div className="absolute inset-0" id="tech-canvas-anchor">
      <StaticFallback />
      {hasLoaded && shouldRender && (
        <Suspense fallback={null}>
          <div className="absolute inset-0 animate-fade-in">
            <TokamakScene
              isVisible={isVisible}
              mobile={isMobile}
              reducedMotion={reducedMotion}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
