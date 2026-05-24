import { useState, useEffect, useRef, type RefObject } from 'react';

interface VisibilityState {
  inViewport: boolean;
  tabActive: boolean;
}

/**
 * Tracks both viewport intersection and tab visibility.
 * Returns true only when the element is in the viewport AND the tab is active.
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
        rootMargin: options?.rootMargin ?? '100px',
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
