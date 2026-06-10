import { useState, useEffect } from "react";

let cached: boolean | null = null;

function detectWebGL(): boolean {
  if (typeof window === "undefined") return true; // SSR: assume supported, will degrade client-side
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

export function useWebGL(): boolean {
  // Start false so SSR and initial client render match. After hydration,
  // detect actual WebGL support and switch to canvas if available.
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(detectWebGL());
  }, []);

  return supported;
}
