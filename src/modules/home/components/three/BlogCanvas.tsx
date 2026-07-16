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

const BlogScene = lazy(() =>
  import("./BlogScene").then((mod) => ({ default: mod.BlogScene })),
);

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

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
        className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-1/3 top-1/3 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.03]"
        style={{
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

export function BlogCanvas() {
  const [hasLoaded, setHasLoaded] = useState(
    // No anchor in the DOM (e.g. reduced-motion fallback): load immediately.
    () =>
      typeof document !== "undefined" &&
      !document.getElementById("blog-canvas-anchor"),
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const isVisible = useCanvasVisibility("blog-canvas-anchor");
  const shouldRender = useDelayedUnmount(isVisible, 3000);
  const webglSupported = useWebGL();

  useEffect(() => {
    const anchor = document.getElementById("blog-canvas-anchor");
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

  if (reducedMotion || !webglSupported) return <StaticFallback />;

  return (
    <div className="absolute inset-0 overflow-hidden" id="blog-canvas-anchor">
      {/* On mobile, keep a wider canvas so the rings stay round — sides get cropped instead */}
      <div className="absolute inset-y-0 left-1/2 w-[900px] -translate-x-1/2 sm:inset-x-0 sm:left-0 sm:w-full sm:translate-x-0">
        <StaticFallback />
        {hasLoaded && shouldRender && (
          <Suspense fallback={null}>
            <div className="absolute inset-0 animate-fade-in">
              <BlogScene isVisible={isVisible} />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
