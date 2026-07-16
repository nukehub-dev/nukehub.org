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

const AtomicOrbitalsScene = lazy(() =>
  import("./AtomicOrbitals").then((mod) => ({
    default: mod.AtomicOrbitalsScene,
  })),
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
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

export function CTACanvas() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const isVisible = useCanvasVisibility("cta-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 3000);
  const webglSupported = useWebGL();
  const showFallback = reducedMotion || !webglSupported;

  // Adjust during render: the fallback branch has no anchor to observe,
  // so there is nothing to lazy-load.
  if (showFallback && !hasLoaded) {
    setHasLoaded(true);
  }

  useEffect(() => {
    const anchor = document.getElementById("cta-canvas-anchor");
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
  }, []);

  if (showFallback) return <StaticFallback />;

  return (
    <div className="absolute inset-0" id="cta-canvas-anchor">
      <StaticFallback />
      {hasLoaded && shouldRender && (
        <Suspense fallback={null}>
          <div className="absolute inset-0 animate-fade-in">
            <AtomicOrbitalsScene isVisible={isVisible} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
