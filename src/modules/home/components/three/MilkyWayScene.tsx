import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPrimaryColor } from "@lib/themeColors";

/* ------------------------------------------------------------------ */
// Galaxy shaders
/* ------------------------------------------------------------------ */
const GALAXY_VERT = `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;

uniform float uTime;
uniform float uTheme;
uniform float uGlobalScale;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;

  // Theme-based alpha: subtle specks in light, glowing in dark
  float themeMul = uTheme > 0.5 ? 0.25 : 1.0;
  vAlpha = themeMul;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Size attenuation + theme scaling
  float size = aSize * uGlobalScale * (300.0 / -mvPosition.z);
  size *= uTheme > 0.5 ? 0.5 : 1.0;

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = max(size, 0.5);
}
`;

const GALAXY_FRAG = `
precision highp float;

uniform float uTime;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Circular soft star
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  // Soft glow falloff
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 1.4);

  // Subtle twinkle
  float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + vColor.r * 10.0);

  gl_FragColor = vec4(vColor * twinkle, glow * vAlpha);
}
`;

/* ------------------------------------------------------------------ */
// Galaxy star field
/* ------------------------------------------------------------------ */
function GalaxyStars({
  primaryColor,
  isLight,
}: {
  primaryColor: string;
  isLight: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = 5000;

  const { positions, colors, sizes, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    const primary = new THREE.Color(primaryColor);
    // Vibrant accent palette — no pure white, everything stays in the primary family
    const cCore = primary.clone().offsetHSL(0.0, 0.15, 0.18);
    const cArm1 = primary.clone().offsetHSL(0.04, 0.05, 0.08);
    const cArm2 = primary.clone().offsetHSL(-0.06, 0.1, 0.12);
    const cDust = primary.clone().offsetHSL(0.1, -0.1, -0.05);
    const cBright = primary.clone().offsetHSL(0.0, -0.1, 0.35); // bright primary tint, not white

    const armCount = 3;
    const armSpread = 0.35;
    const galaxyRadius = 5.0;
    const bulgeRadius = 0.7;

    for (let i = 0; i < count; i++) {
      const isBulge = Math.random() < 0.1;
      let x: number, y: number, z: number, r: number;

      if (isBulge) {
        r = Math.pow(Math.random(), 2.5) * bulgeRadius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta) * 0.4;
        z = r * Math.cos(phi) * 0.4;
      } else {
        const armIndex = Math.floor(Math.random() * armCount);
        const armAngle = (armIndex / armCount) * Math.PI * 2;
        r = Math.pow(Math.random(), 0.75) * galaxyRadius;
        const spiralTightness = 2.6;
        const angle = armAngle + r * spiralTightness;
        const spread = (Math.random() - 0.5) * armSpread * (1.0 + r * 0.25);
        const armOffset = angle + spread;
        const thickness = 0.06 + 0.2 * Math.exp(-r * 0.7);
        x = Math.cos(armOffset) * r;
        z = Math.sin(armOffset) * r;
        y = (Math.random() - 0.5) * thickness * 2.0;
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const distFromCenter = Math.sqrt(x * x + z * z);
      const sizeBase = isBulge ? 2.2 : 1.0;
      const sizeFalloff = Math.exp(-distFromCenter * 0.2);
      sz[i] = sizeBase * sizeFalloff + Math.random() * 0.4;

      // Color: accent-palette driven (more saturated, no muddy grays)
      const colorRoll = Math.random();
      let starColor: THREE.Color;
      if (isBulge) {
        starColor = colorRoll < 0.5 ? cCore : cBright;
      } else if (distFromCenter < 1.2) {
        starColor =
          colorRoll < 0.45 ? cArm1 : colorRoll < 0.8 ? cCore : cBright;
      } else if (distFromCenter < 3.0) {
        starColor =
          colorRoll < 0.4
            ? cArm1
            : colorRoll < 0.7
              ? cArm2
              : colorRoll < 0.85
                ? cBright
                : cDust;
      } else {
        starColor = colorRoll < 0.6 ? cDust : cArm2;
      }

      col[i * 3] = starColor.r;
      col[i * 3 + 1] = starColor.g;
      col[i * 3 + 2] = starColor.b;

      ph[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, colors: col, sizes: sz, phases: ph };
  }, [primaryColor]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTheme: { value: isLight ? 1.0 : 0.0 },
      uGlobalScale: { value: 1.0 },
    }),
    [isLight],
  );

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    // Internal slow spin (mouse parallax is handled by parent InteractiveGroup)
    pointsRef.current.rotation.y = t * 0.012;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
    }
  });

  return (
    <points ref={pointsRef} rotation={[0.25, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={GALAXY_VERT}
        fragmentShader={GALAXY_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
// Central core glow
/* ------------------------------------------------------------------ */
function CoreGlow({
  primaryColor,
  isLight,
}: {
  primaryColor: string;
  isLight: boolean;
}) {
  const spriteRef = useRef<THREE.Sprite>(null);

  useFrame((state) => {
    if (spriteRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 0.7) * 0.06;
      spriteRef.current.scale.set(2.8 * pulse, 2.8 * pulse, 1.0);
    }
  });

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.85)");
    grad.addColorStop(0.2, "rgba(255,255,255,0.35)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.08)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <sprite ref={spriteRef} position={[0, 0, 0]}>
      <spriteMaterial
        map={texture}
        color={primaryColor}
        transparent
        opacity={isLight ? 0.2 : 0.45}
        blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}

/* ------------------------------------------------------------------ */
// Faint outer halo
/* ------------------------------------------------------------------ */
function OuterHalo({
  primaryColor,
  isLight,
}: {
  primaryColor: string;
  isLight: boolean;
}) {
  const spriteRef = useRef<THREE.Sprite>(null);

  useFrame((state) => {
    if (spriteRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 0.4) * 0.04;
      spriteRef.current.scale.set(8.0 * pulse, 8.0 * pulse, 1.0);
    }
  });

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.15)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.04)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <sprite ref={spriteRef} position={[0, 0, -0.5]}>
      <spriteMaterial
        map={texture}
        color={primaryColor}
        transparent
        opacity={isLight ? 0.08 : 0.2}
        blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}

/* ------------------------------------------------------------------ */
// Interactive group wrapper
/* ------------------------------------------------------------------ */
function InteractiveGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentRot = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current = { x: x * 0.5, y: y * 0.3 };
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    currentRot.current.x += (mouseRef.current.y - currentRot.current.x) * 0.03;
    currentRot.current.y += (mouseRef.current.x - currentRot.current.y) * 0.03;
    groupRef.current.rotation.x = currentRot.current.x;
    groupRef.current.rotation.y += 0.0008; // very slow continuous rotation
  });

  return <group ref={groupRef}>{children}</group>;
}

/* ------------------------------------------------------------------ */
// Scene
/* ------------------------------------------------------------------ */
function Scene({
  primaryColor,
  isLight,
}: {
  primaryColor: string;
  isLight: boolean;
}) {
  return (
    <InteractiveGroup>
      <GalaxyStars primaryColor={primaryColor} isLight={isLight} />
      <CoreGlow primaryColor={primaryColor} isLight={isLight} />
      <OuterHalo primaryColor={primaryColor} isLight={isLight} />
    </InteractiveGroup>
  );
}

/* ------------------------------------------------------------------ */
// Exported
/* ------------------------------------------------------------------ */
export function MilkyWayScene({ isVisible }: { isVisible: boolean }) {
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
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.8, 5.5], fov: 50 }}
      frameloop={isVisible ? "always" : "never"}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <Scene primaryColor={color} isLight={isLight} />
    </Canvas>
  );
}
