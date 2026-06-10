"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPrimaryColor } from "@lib/themeColors";
import { useWebGL } from "@lib/useWebGL";

/* ======================================================================== */
// Fragment shader — flowing aurora nebula with stars
/* ======================================================================== */
const FRAG = `
precision highp float;

uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uTheme;
uniform vec2 uResolution;

varying vec2 vUv;

// ── Hash & Noise ──
vec3 hash33(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

// ── Soft circular glow ──
float softGlow(vec2 p, vec2 center, float radius, float softness) {
  float d = length(p - center);
  return exp(-d * d / (radius * radius)) * softness;
}

// ── Star field ──
float stars(vec2 uv, float t) {
  float starField = 0.0;
  for (int i = 0; i < 3; i++) {
    float scale = mix(80.0, 250.0, float(i) / 2.0);
    vec2 grid = uv * scale;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float h = hash(cell + vec2(float(i) * 47.0));
    if (h > 0.992 - float(i) * 0.002) {
      float size = 0.08 + hash(cell * 2.0) * 0.15;
      float brightness = 0.5 + hash(cell * 3.0) * 0.5;
      float d = length(local * (0.7 + hash(cell) * 0.6));
      float star = smoothstep(size, size * 0.2, d) * brightness;
      star *= 0.7 + 0.3 * sin(t * (1.5 + h * 2.0) + h * 30.0);
      starField += star;
    }
  }
  return starField;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * 2.0;
  float aspect = uResolution.x / uResolution.y;
  p.x *= aspect;

  float t = uTime * 0.015;

  // ── Base background ──
  vec3 col;
  if (uTheme > 0.5) {
    col = vec3(0.97, 0.97, 0.98);
  } else {
    col = vec3(0.02, 0.022, 0.03);
  }

  // ── Domain-warped FBM for aurora ribbons ──
  vec2 q = vec2(
    fbm(uv * 1.8 + vec2(0.0, t * 0.3)),
    fbm(uv * 1.8 + vec2(3.2, 9.1) + t * 0.2)
  );
  vec2 r = vec2(
    fbm(uv * 1.8 + 1.5 * q + vec2(1.7, 9.2) + t * 0.15),
    fbm(uv * 1.8 + 1.5 * q + vec2(8.3, 2.8) + t * 0.25)
  );
  float f = fbm(uv * 1.8 + 2.0 * r + t * 0.1);

  // ── Aurora gas clouds ──
  float gas = clamp(length(q) * 0.4 + length(r) * 0.25 + f * f * 0.5, 0.0, 1.0);

  // Soft horizontal banding for aurora feel
  float band = sin(p.y * 1.5 + fbm(p * 2.0 + t * 0.2) * 2.0) * 0.5 + 0.5;
  gas *= band * 0.6 + 0.4;

  if (uTheme > 0.5) {
    // Light mode — very subtle, airy
    col = mix(col, uColor1, gas * 0.08);
    col = mix(col, uColor2, clamp(f * gas * 0.5, 0.0, 1.0) * 0.06);
    col = mix(col, uColor3, clamp(f * f * gas * 0.4, 0.0, 1.0) * 0.04);
  } else {
    // Dark mode — rich, luminous
    col = mix(col, uColor1, gas * 0.1);
    col = mix(col, uColor2, clamp(f * gas * 0.5, 0.0, 1.0) * 0.08);
    col = mix(col, uColor3, clamp(f * f * gas * 0.4, 0.0, 1.0) * 0.06);
  }

  // ── Large soft drifting orbs ──
  float orb1 = softGlow(p, vec2(sin(t * 0.4) * 1.2, cos(t * 0.3) * 0.6), 1.8, 0.15);
  float orb2 = softGlow(p, vec2(cos(t * 0.35 + 2.0) * 1.0, sin(t * 0.45 + 1.0) * 0.8), 2.0, 0.12);
  float orb3 = softGlow(p, vec2(sin(t * 0.25 + 4.0) * 0.8, cos(t * 0.35 + 3.0) * 0.5), 1.5, 0.10);

  if (uTheme > 0.5) {
    col += uColor1 * orb1 * 0.06;
    col += uColor2 * orb2 * 0.04;
    col += uColor3 * orb3 * 0.03;
  } else {
    col += uColor1 * orb1 * 0.05;
    col += uColor2 * orb2 * 0.03;
    col += uColor3 * orb3 * 0.02;
  }

  // ── Stars ──
  float starField = stars(uv, uTime);
  if (uTheme > 0.5) {
    col = mix(col, uColor1 * 0.7, starField * 0.15);
  } else {
    col += vec3(1.0) * starField * 0.5;
  }

  // ── Subtle center glow ──
  float centerDist = length(p * vec2(0.6, 1.0));
  float centerGlow = exp(-centerDist * centerDist * 2.5);
  if (uTheme > 0.5) {
    col = mix(col, uColor1, centerGlow * 0.04);
  } else {
    col += uColor1 * centerGlow * 0.02;
  }

  // ── Vignette ──
  float vignetteDist = length(p * vec2(0.7, 1.0));
  if (uTheme > 0.5) {
    float vig = 1.0 - smoothstep(0.5, 1.5, vignetteDist);
    col = mix(vec3(0.97, 0.97, 0.98), col, vig * 0.7 + 0.3);
  } else {
    float vig = 1.0 - smoothstep(0.3, 1.4, vignetteDist * 0.9);
    col *= vig * 0.5 + 0.5;
  }

  // ── Subtle film grain ──
  float grain = hash(uv * uResolution + fract(uTime * 0.1)) * 0.03;
  col += grain - 0.015;

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

/* ======================================================================== */
// Full-screen shader plane
/* ======================================================================== */
function AuroraPlane({
  primaryColor,
  isLight,
}: {
  primaryColor: string;
  isLight: boolean;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colors = useMemo(() => {
    const c1 = new THREE.Color(primaryColor);
    const c2 = c1.clone().offsetHSL(0.06, -0.05, 0.1);
    const c3 = c1.clone().offsetHSL(-0.1, 0.05, -0.05);
    return {
      uColor1: c1,
      uColor2: c2,
      uColor3: c3,
    };
  }, [primaryColor]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: colors.uColor1 },
      uColor2: { value: colors.uColor2 },
      uColor3: { value: colors.uColor3 },
      uTheme: { value: isLight ? 1.0 : 0.0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    }),
    [colors, isLight],
  );

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uResolution.value.set(
      state.size.width * state.viewport.dpr,
      state.size.height * state.viewport.dpr,
    );
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ======================================================================== */
// Main export
/* ======================================================================== */
export function SupportBackground() {
  const [color, setColor] = useState(() => getPrimaryColor());
  const [isLight, setIsLight] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const webglSupported = useWebGL();

  useEffect(() => {
    const update = () => {
      setColor(getPrimaryColor());
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

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handleMotion = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mq.addEventListener("change", handleMotion);

    // IntersectionObserver: pause rendering when not in viewport
    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    if (containerRef.current) io.observe(containerRef.current);

    // Page Visibility API: pause when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) setIsVisible(false);
      else {
        // Restore visibility based on intersection
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setIsVisible(rect.top < window.innerHeight && rect.bottom > 0);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", handleMotion);
      io.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const frameLoop = reducedMotion || !isVisible ? "never" : "always";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0"
      style={{ pointerEvents: "none" }}
    >
      {reducedMotion || !webglSupported ? (
        <div
          className="absolute inset-0"
          style={{
            background: isLight
              ? `radial-gradient(ellipse at 50% 0%, ${color}22 0%, transparent 60%)`
              : `radial-gradient(ellipse at 50% 0%, ${color}33 0%, transparent 60%), radial-gradient(circle at 80% 20%, ${color}18 0%, transparent 40%)`,
          }}
        />
      ) : (
        <Canvas
          dpr={[
            1,
            Math.min(
              typeof window !== "undefined" ? window.devicePixelRatio : 1,
              1.5,
            ),
          ]}
          camera={{ position: [0, 0, 1] }}
          frameloop={frameLoop}
          gl={{
            antialias: false,
            powerPreference: "high-performance",
            alpha: false,
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <AuroraPlane primaryColor={color} isLight={isLight} />
        </Canvas>
      )}
    </div>
  );
}
