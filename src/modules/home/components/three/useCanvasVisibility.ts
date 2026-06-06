import { useState, useEffect, useRef, type RefObject } from 'react';

interface VisibilityState {
  inViewport: boolean;
  tabActive: boolean;
}

/**
 * Tracks both viewport intersection and tab visibility.
 * Returns true only when the element is in the viewport AND the tab is active.
 *
 * Default rootMargin is '-20%' so canvases stop rendering before they're
 * fully scrolled out of view, reducing simultaneous active WebGL contexts.
 */
export function useCanvasVisibility(
  anchorId: string,
  options?: { rootMargin?: string; threshold?: number }
): boolean {
  const [state, setState] = useState<VisibilityState>({
    inViewport: false,
    tabActive: true,
  });
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) {
      setState((s) => ({ ...s, inViewport: true }));
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setState((s) => ({ ...s, inViewport: entry.isIntersecting }));
      },
      {
        rootMargin: options?.rootMargin ?? '-20%',
        threshold: options?.threshold ?? 0,
      }
    );
    observerRef.current.observe(el);

    const handleTab = () => {
      setState((s) => ({ ...s, tabActive: !document.hidden }));
    };
    document.addEventListener('visibilitychange', handleTab);

    return () => {
      observerRef.current?.disconnect();
      document.removeEventListener('visibilitychange', handleTab);
    };
  }, [anchorId, options?.rootMargin, options?.threshold]);

  return state.inViewport && state.tabActive;
}

/**
 * Delays unmounting by `delayMs` after `visible` becomes false.
 * Useful for WebGL canvases so they don't flash when quickly scrolling past.
 */
export function useDelayedUnmount(visible: boolean, delayMs = 3000): boolean {
  const [shouldRender, setShouldRender] = useState(visible);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShouldRender(true);
    } else {
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
      }, delayMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, delayMs]);

  return shouldRender;
}
