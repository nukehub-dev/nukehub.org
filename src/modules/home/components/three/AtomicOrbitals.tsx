import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPrimaryColor } from "@lib/themeColors";

// Deterministic PRNG — keeps particle layouts pure and render-safe
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
// Drifting particle field
/* ------------------------------------------------------------------ */
function ParticleField({
  color,
  isLight,
}: {
  color: string;
  isLight: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const simRef = useRef<{
    positions: Float32Array;
    velocities: Float32Array;
    phases: Float32Array;
  } | null>(null);
  const count = 80;

  // Per-frame simulation state is mutable, so it lives in a ref, not a memo
  useEffect(() => {
    const rand = mulberry32(0x9e3779b9);
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 14;
      pos[i * 3 + 1] = (rand() - 0.5) * 8;
      pos[i * 3 + 2] = (rand() - 0.5) * 4;
      vel[i * 3] = (rand() - 0.5) * 0.004;
      vel[i * 3 + 1] = (rand() - 0.5) * 0.003;
      vel[i * 3 + 2] = (rand() - 0.5) * 0.001;
      ph[i] = rand() * Math.PI * 2;
    }
    simRef.current = { positions: pos, velocities: vel, phases: ph };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const sim = simRef.current;
    if (!meshRef.current || !sim) return;
    const { positions, velocities, phases } = sim;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      positions[ix] += velocities[ix];
      positions[ix + 1] += velocities[ix + 1];
      positions[ix + 2] += velocities[ix + 2];

      if (positions[ix] > 7) positions[ix] = -7;
      if (positions[ix] < -7) positions[ix] = 7;
      if (positions[ix + 1] > 4) positions[ix + 1] = -4;
      if (positions[ix + 1] < -4) positions[ix + 1] = 4;

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.6 + phases[i]);
      dummy.position.set(positions[ix], positions[ix + 1], positions[ix + 2]);
      dummy.scale.setScalar(
        (isLight ? 0.008 : 0.015) + pulse * (isLight ? 0.006 : 0.01),
      );
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <circleGeometry args={[1, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={isLight ? 0.12 : 0.3}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
// Gentle orbital rings — single useFrame updates all rings
/* ------------------------------------------------------------------ */
function OrbitalRings({ color, isLight }: { color: string; isLight: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const ringDefs = useMemo(
    () => [
      { radius: 2.2, speed: 0.8, phase: 0, tilt: 0.25 },
      { radius: 3.4, speed: 0.5, phase: 2.1, tilt: -0.15 },
      { radius: 4.6, speed: 0.35, phase: 4.2, tilt: 0.1 },
    ],
    [],
  );

  const baseOpacity = isLight ? 0.35 : 0.15;
  const thickness = isLight ? 0.035 : 0.018;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      const ring = ringDefs[i];
      if (!ring) return;
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      const breathe = 0.7 + 0.3 * Math.sin(t * ring.speed + ring.phase);
      mat.opacity = baseOpacity * breathe;

      const scalePulse = 1 + 0.03 * Math.sin(t * ring.speed * 0.7 + ring.phase);
      mesh.scale.setScalar(scalePulse);
    });
  });

  return (
    <group ref={groupRef}>
      {ringDefs.map((ring, i) => (
        <mesh key={i} rotation={[Math.PI / 2, ring.tilt, 0]}>
          <ringGeometry args={[ring.radius - thickness, ring.radius, 96]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={baseOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
// Central glow
/* ------------------------------------------------------------------ */
function CentralGlow({ color, isLight }: { color: string; isLight: boolean }) {
  const spriteRef = useRef<THREE.Sprite>(null);

  useFrame((state) => {
    if (spriteRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
      spriteRef.current.scale.set(5 * pulse, 5 * pulse, 1);
    }
  });

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,0.6)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.2)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <sprite ref={spriteRef} position={[0, 0, -1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={isLight ? 0.45 : 0.45}
        blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
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
  const displayColor = primaryColor;

  return (
    <group rotation={[0.2, 0, 0]}>
      <CentralGlow color={displayColor} isLight={isLight} />
      <OrbitalRings color={displayColor} isLight={isLight} />
      <ParticleField color={displayColor} isLight={isLight} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
// Exported
/* ------------------------------------------------------------------ */
export function AtomicOrbitalsScene({ isVisible }: { isVisible: boolean }) {
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
      camera={{ position: [0, 0, 5], fov: 50 }}
      frameloop={isVisible ? "always" : "never"}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <Scene primaryColor={color} isLight={isLight} />
    </Canvas>
  );
}
