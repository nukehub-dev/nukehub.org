import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

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
  for (int i = 0; i < 5; i++) {
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

// Butterfly-shaped density mask
float butterflyMask(vec2 p) {
  float x = abs(p.x);
  float y = p.y;
  float body = exp(-x * x * 8.0 - y * y * 2.0);
  float upper = exp(-x * x * 2.5 - (y - 0.35) * (y - 0.35) * 4.0);
  float lower = exp(-x * x * 2.5 - (y + 0.35) * (y + 0.35) * 4.0);
  float mask = body + upper * 0.7 + lower * 0.7;
  return smoothstep(0.0, 0.5, mask);
}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.02;
  vec2 p = (uv - 0.5) * 2.0;

  if (uTheme > 0.5) {
    // ── LIGHT MODE: Airy, watercolor-like nebula ──
    vec3 bgCol = vec3(0.98, 0.98, 0.99); // Match clean light background
    vec3 col = bgCol;

    float bMask = butterflyMask(p);

    vec2 q = vec2(
      fbm(uv * 1.5 + vec2(0.0, t)),
      fbm(uv * 1.5 + vec2(1.7, 9.2) + t * 0.5)
    );
    vec2 r = vec2(
      fbm(uv * 1.5 + 1.0 * q + vec2(1.7, 9.2) + t * 0.2),
      fbm(uv * 1.5 + 1.0 * q + vec2(8.3, 2.8) + t * 0.3)
    );
    float f = fbm(uv * 1.5 + 2.0 * r);

    float gas = clamp(length(q) * 0.5 + length(r) * 0.3 + f * f * 0.6, 0.0, 1.0);
    gas *= bMask;

    // Softly mix in the vibrant colors (no muddy grays)
    col = mix(col, uColor1, gas * 0.15);
    col = mix(col, uColor2, clamp(f * bMask * 0.7, 0.0, 1.0) * 0.10);
    col = mix(col, uColor3, clamp(f * f * bMask * 0.5, 0.0, 1.0) * 0.08);

    // Subtle central glow
    float dist = length(p);
    float centerGlow = exp(-dist * dist * 3.0) * 0.1;
    col = mix(col, uColor1, centerGlow);

    // Stars
    float starField = 0.0;
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
        star *= 0.6 + 0.4 * sin(uTime * 3.0 + h * 20.0);
        starField += star;
      }
    }
    
    // Mix stars as slightly darker, saturated accent specks
    col = mix(col, uColor1 * 0.6, starField * 0.25);

    // Smoothly fade edges to background color (reverse vignette)
    float edgeFade = smoothstep(1.3, 0.4, dist); 
    col = mix(bgCol, col, edgeFade);

    gl_FragColor = vec4(col, 1.0);

  } else {
    // ── DARK MODE: subtle ambient nebula ──
    float bMask = butterflyMask(p);

    vec2 q = vec2(
      fbm(uv * 1.5 + vec2(0.0, t)),
      fbm(uv * 1.5 + vec2(1.7, 9.2) + t * 0.5)
    );
    vec2 r = vec2(
      fbm(uv * 1.5 + 1.0 * q + vec2(1.7, 9.2) + t * 0.2),
      fbm(uv * 1.5 + 1.0 * q + vec2(8.3, 2.8) + t * 0.3)
    );
    float f = fbm(uv * 1.5 + 2.0 * r);

    // Deep navy base — visible but still dark
    vec3 col = vec3(0.018, 0.018, 0.032);

    float gas = clamp(length(q) * 0.5 + length(r) * 0.3 + f * f * 0.6, 0.0, 1.0);
    gas *= bMask;

    // Gas clouds — stronger accent presence
    col = mix(col, uColor1, gas * 0.72);
    col = mix(col, uColor2, clamp(f * bMask * 0.7, 0.0, 1.0) * 0.58);
    col = mix(col, uColor3, clamp(f * f * bMask * 0.5, 0.0, 1.0) * 0.42);

    // Central glow — stronger warm core
    float starGlow = exp(-length(p) * length(p) * 4.0) * 0.22;
    col += vec3(1.0, 0.92, 0.85) * starGlow;

    // Stars
    float starField = 0.0;
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
        star *= 0.6 + 0.4 * sin(uTime * 3.0 + h * 20.0);
        starField += star;
      }
    }
    col += vec3(1.0) * starField * 0.65;

    // Gentle vignette — keeps edges dark but center more luminous
    float vignette = 1.0 - smoothstep(0.35, 1.3, length(p) * 0.85);
    col *= vignette * 0.65 + 0.12;

    gl_FragColor = vec4(col, 1.0);
  }
}
`;

function NebulaPlane({ primaryColor, isLight }: { primaryColor: string; isLight: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colors = useMemo(() => {
    const c1 = new THREE.Color(primaryColor);
    const c2 = c1.clone().offsetHSL(0.05, -0.1, -0.15);
    const c3 = c1.clone().offsetHSL(-0.08, 0.1, -0.25);
    return {
      uColor1: c1.clone().multiplyScalar(isLight ? 1.0 : 1.0),
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
    [colors, isLight]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef}>
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

export function NebulaScene({ isVisible }: { isVisible: boolean }) {
  const [color, setColor] = useState(() => getPrimaryColor());
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const update = () => {
      setColor(getPrimaryColor());
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Canvas
      dpr={[1, 1]}
      camera={{ position: [0, 0, 1] }}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <NebulaPlane primaryColor={color} isLight={isLight} />
    </Canvas>
  );
}
