import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPrimaryColor } from "@lib/themeColors";

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// "Signal waves" — concentric broadcast rings radiating from a pulsing
// source, matching the blog/news theme. Fullscreen shader plane, one draw.
const FRAG = `
precision highp float;

uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uResolution;
uniform float uTheme; // 0 = dark, 1 = light

varying vec2 vUv;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * snoise(p * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum;
}

// Hash for stars
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Expanding concentric rings, organically wobbled, fading with distance.
float signalRings(vec2 p, float t) {
  float d = length(p);
  float wobble = snoise(p * 3.0 + t * 0.25) * 0.04;
  float phase = fract((d + wobble) * 2.4 - t * 0.1);
  float band = smoothstep(0.0, 0.10, phase) * smoothstep(0.38, 0.10, phase);
  return band * exp(-d * 1.3);
}

float starField(vec2 uv, float t) {
  float field = 0.0;
  for (int i = 0; i < 3; i++) {
    float scale = 150.0 + float(i) * 120.0;
    vec2 grid = uv * scale;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float h = hash(cell + vec2(float(i) * 13.0));
    if (h > 0.997 - float(i) * 0.0015) {
      float size = 0.15 + hash(cell * 2.0) * 0.25;
      float brightness = hash(cell * 3.0 + float(i));
      float distStar = length(local * (0.8 + hash(cell) * 0.4));
      float star = smoothstep(size, size * 0.3, distStar) * brightness;
      star *= 0.6 + 0.4 * sin(t * 3.0 + h * 20.0);
      field += star;
    }
  }
  return field;
}

void main() {
  vec2 uv = vUv;
  float t = uTime;
  float tSlow = uTime * 0.02;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0); // keep rings circular

  float d = length(p);
  float rings = signalRings(p, t);
  float pulse = 0.5 + 0.5 * sin(t * 1.6);
  float source = exp(-d * d * 24.0) * (0.55 + 0.45 * pulse);
  float stars = starField(uv, t);

  // Faint drifting gas so the field isn't sterile
  vec2 q = vec2(
    fbm(uv * 1.5 + vec2(0.0, tSlow)),
    fbm(uv * 1.5 + vec2(1.7, 9.2) + tSlow * 0.5)
  );
  float gas = clamp(length(q) * 0.5, 0.0, 1.0) * exp(-d * 0.9);

  if (uTheme > 0.5) {
    // ── LIGHT MODE: airy paper-white with faint accent waves ──
    vec3 bgCol = vec3(0.98, 0.98, 0.99);
    vec3 col = bgCol;

    col = mix(col, uColor1, rings * 0.16);
    col = mix(col, uColor2, gas * 0.10);
    col = mix(col, uColor1, source * 0.14);
    col = mix(col, uColor1 * 0.6, stars * 0.25);

    float edgeFade = smoothstep(1.6, 0.5, d);
    col = mix(bgCol, col, edgeFade);

    gl_FragColor = vec4(col, 1.0);
  } else {
    // ── DARK MODE: deep field, glowing signal waves ──
    vec3 col = vec3(0.018, 0.018, 0.032);

    col = mix(col, uColor2, gas * 0.45);
    col = mix(col, uColor1, rings * 0.55);
    col += vec3(1.0, 0.92, 0.85) * source * 0.35;
    col += uColor1 * source * 0.45;
    col += vec3(1.0) * stars * 0.6;

    float vignette = 1.0 - smoothstep(0.4, 1.6, d);
    col *= vignette * 0.7 + 0.12;

    gl_FragColor = vec4(col, 1.0);
  }
}
`;

function SignalPlane({
  primaryColor,
  isLight,
}: {
  primaryColor: string;
  isLight: boolean;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colors = useMemo(() => {
    const c1 = new THREE.Color(primaryColor);
    const c2 = c1.clone().offsetHSL(0.05, -0.1, -0.15);
    const c3 = c1.clone().offsetHSL(-0.08, 0.1, -0.25);
    return {
      uColor1: c1,
      uColor2: c2.clone().multiplyScalar(isLight ? 0.9 : 0.8),
      uColor3: c3.clone().multiplyScalar(isLight ? 0.8 : 0.6),
    };
  }, [primaryColor, isLight]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: colors.uColor1 },
      uColor2: { value: colors.uColor2 },
      uColor3: { value: colors.uColor3 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTheme: { value: isLight ? 1.0 : 0.0 },
    }),
    [colors, isLight],
  );

  const accRef = useRef(0);
  useFrame((state, delta) => {
    if (!materialRef.current) return;
    // Track real aspect so the rings stay circular.
    const { width, height } = state.size;
    materialRef.current.uniforms.uResolution.value.set(width, height);
    // 30fps is plenty for slow ambient motion.
    accRef.current += delta;
    if (accRef.current < 1 / 30) return;
    accRef.current = 0;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
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

export function BlogScene({ isVisible }: { isVisible: boolean }) {
  const [color, setColor] = useState(() => getPrimaryColor());
  const [isLight, setIsLight] = useState(false);

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
    return () => observer.disconnect();
  }, []);

  return (
    <Canvas
      dpr={[1, 1]}
      camera={{ position: [0, 0, 1] }}
      frameloop={isVisible ? "always" : "never"}
      gl={{
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <SignalPlane primaryColor={color} isLight={isLight} />
    </Canvas>
  );
}
