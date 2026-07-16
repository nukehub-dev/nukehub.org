import { useSyncExternalStore } from "react";

let cached: boolean | null = null;

function detectWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    cached = !!gl && gl instanceof WebGLRenderingContext;
  } catch {
    cached = false;
  }
  return cached;
}

const subscribe = () => () => {};

export function useWebGL(): boolean {
  // SSR and the first client render report `false` so hydration matches; real
  // WebGL support is detected once after hydration and never changes again.
  return useSyncExternalStore(subscribe, detectWebGL, () => false);
}
