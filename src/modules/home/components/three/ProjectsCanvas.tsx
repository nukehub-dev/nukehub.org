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

const ProjectsScene = lazy(() =>
  import("./ProjectsScene").then((mod) => ({ default: mod.ProjectsScene })),
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

export function StaticFallback() {
  const primary = useSyncExternalStore(
    subscribePrimaryColor,
    getPrimaryColor,
    () => "#f37524",
  );

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
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  // Default to mobile so the heavy Three.js chunk is not requested on phones.
  const [isMobile, setIsMobile] = useState(true);
  const isVisible = useCanvasVisibility("projects-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 3000);
  const webglSupported = useWebGL();
  const showFallback = reducedMotion || !webglSupported || isMobile;

  // Adjust during render: the fallback branch has no anchor to observe,
  // so there is nothing to lazy-load.
  if (showFallback && !hasLoaded) {
    setHasLoaded(true);
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });

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
    }

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  if (showFallback) return <StaticFallback />;

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
              <ProjectsScene isVisible={isVisible} />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
