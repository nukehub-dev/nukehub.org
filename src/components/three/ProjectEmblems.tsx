import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAccentColor } from './useAccentColor';

/* -------------------------------------------------------------------------- */
/*  Shared utilities                                                          */
/* -------------------------------------------------------------------------- */

function useFloatRef(speed = 1, amplitude = 0.15) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = Math.sin(t * speed) * amplitude;
  });
  return ref;
}

/* -------------------------------------------------------------------------- */
/*  NRMS — Wireframe Globe with Reactor Pins                                  */
/* -------------------------------------------------------------------------- */

function GlobeEmblem({ position }: { position: [number, number, number] }) {
  const groupRef = useFloatRef(0.4, 0.12);
  const globeRef = useRef<THREE.Mesh>(null);
  const accent = useAccentColor();

  const pins = useMemo(() => {
    const items: { pos: [number, number, number]; h: number }[] = [];
    const fibN = 16;
    const phi = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < fibN; i++) {
      const y = 1 - (i / (fibN - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      items.push({ pos: [x * 1.05, y * 1.05, z * 1.05], h: 0.08 + Math.random() * 0.06 });
    }
    return items;
  }, []);

  useFrame((_, delta) => {
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={globeRef}>
        <mesh>
          <icosahedronGeometry args={[1, 2]} />
          <meshBasicMaterial color={accent} wireframe transparent opacity={0.25} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={accent} wireframe transparent opacity={0.1} />
        </mesh>
        {pins.map((p, i) => {
          const pos = new THREE.Vector3(...p.pos);
          const dir = pos.clone().normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          return (
            <mesh key={i} position={p.pos} quaternion={quat}>
              <cylinderGeometry args={[0.015, 0.015, p.h, 6]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  NukeAnalytics — Crystalline Data Bars                                     */
/* -------------------------------------------------------------------------- */

function BarsEmblem({ position }: { position: [number, number, number] }) {
  const groupRef = useFloatRef(0.5, 0.1);
  const accent = useAccentColor();

  const bars = useMemo(
    () => [
      { x: -0.35, h: 1.0, delay: 0 },
      { x: 0, h: 1.5, delay: 0.8 },
      { x: 0.35, h: 0.8, delay: 1.6 },
    ],
    []
  );

  return (
    <group ref={groupRef} position={position}>
      {bars.map((b, i) => (
        <Bar key={i} x={b.x} height={b.h} accent={accent} delay={b.delay} />
      ))}
    </group>
  );
}

function Bar({ x, height, accent, delay }: { x: number; height: number; accent: string; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime + delay;
    const s = 0.85 + Math.sin(t * 1.2) * 0.15;
    meshRef.current.scale.y = Math.max(0.1, s);
  });

  return (
    <mesh ref={meshRef} position={[x, height / 2, 0]}>
      <boxGeometry args={[0.25, height, 0.25]} />
      <meshStandardMaterial
        color={accent}
        emissive={accent}
        emissiveIntensity={0.2}
        transparent
        opacity={0.85}
        roughness={0.1}
        metalness={0.5}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  NukeLab — Atom with Orbiting Electrons                                    */
/* -------------------------------------------------------------------------- */

function AtomEmblem({ position }: { position: [number, number, number] }) {
  const groupRef = useFloatRef(0.35, 0.14);
  const accent = useAccentColor();

  return (
    <group ref={groupRef} position={position}>
      {/* Nucleus */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} roughness={0.3} />
      </mesh>
      {/* Orbits */}
      <Orbit radius={0.6} speed={1.0} tilt={[0, 0, 0]} accent={accent} />
      <Orbit radius={0.85} speed={0.7} tilt={[Math.PI / 3, 0, 0]} accent={accent} />
      <Orbit radius={1.1} speed={0.5} tilt={[-Math.PI / 4, Math.PI / 6, 0]} accent={accent} />
    </group>
  );
}

function Orbit({ radius, speed, tilt, accent }: { radius: number; speed: number; tilt: [number, number, number]; accent: string }) {
  const ringRef = useRef<THREE.Group>(null);
  const electronRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (ringRef.current) ringRef.current.rotation.z = t * 0.3;
    if (electronRef.current) {
      electronRef.current.position.x = Math.cos(t) * radius;
      electronRef.current.position.z = Math.sin(t) * radius;
    }
  });

  return (
    <group rotation={tilt}>
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.008, 8, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0.35} />
        </mesh>
      </group>
      <mesh ref={electronRef}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive={accent} emissiveIntensity={1} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  NukeBox — Hexagonal Package with Orbiting Cubes                           */
/* -------------------------------------------------------------------------- */

function BoxEmblem({ position }: { position: [number, number, number] }) {
  const groupRef = useFloatRef(0.45, 0.1);
  const boxRef = useRef<THREE.Group>(null);
  const accent = useAccentColor();

  useFrame((_, delta) => {
    if (boxRef.current) boxRef.current.rotation.y += delta * 0.2;
  });

  const satellites = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        angle: (i / 4) * Math.PI * 2,
        radius: 0.9 + Math.random() * 0.2,
        speed: 0.6 + Math.random() * 0.4,
        size: 0.06 + Math.random() * 0.04,
      })),
    []
  );

  return (
    <group ref={groupRef} position={position}>
      <group ref={boxRef}>
        <mesh rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.7, 6]} />
          <meshStandardMaterial
            color={accent}
            transparent
            opacity={0.25}
            roughness={0.2}
            metalness={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.7, 6]} />
          <meshBasicMaterial color={accent} wireframe transparent opacity={0.15} />
        </mesh>
      </group>
      {satellites.map((s, i) => (
        <Satellite key={i} {...s} accent={accent} />
      ))}
    </group>
  );
}

function Satellite({
  angle,
  radius,
  speed,
  size,
  accent,
}: {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  accent: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + angle;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = Math.sin(t * 2.3) * 0.15;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} roughness={0.3} />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Ambient Particles — connects the emblems with floating dust               */
/* -------------------------------------------------------------------------- */

function AmbientParticles({ count = 80 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const accent = useAccentColor();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 6 - 2,
      speed: 0.05 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      scale: 0.02 + Math.random() * 0.03,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.3,
        p.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.2,
        p.z
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color={accent}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mouse Parallax Wrapper                                                    */
/* -------------------------------------------------------------------------- */

function ParallaxGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const lerp = 1 - Math.exp(-delta * 2);
    target.current.x += (mouse.current.x * 0.3 - target.current.x) * lerp;
    target.current.y += (mouse.current.y * 0.2 - target.current.y) * lerp;
    groupRef.current.rotation.y = target.current.x * 0.15;
    groupRef.current.rotation.x = target.current.y * 0.1;
  });

  return <group ref={groupRef}>{children}</group>;
}

/* -------------------------------------------------------------------------- */
/*  Exported Scene                                                            */
/* -------------------------------------------------------------------------- */

export function EmblemsScene({ mobile }: { mobile?: boolean }) {
  return (
    <ParallaxGroup>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#88ccff" />

      <GlobeEmblem position={[-2.2, 0.8, 0]} />
      <BarsEmblem position={[2.2, 0.8, 0]} />
      <AtomEmblem position={[-2.2, -2.2, 0]} />
      <BoxEmblem position={[2.2, -2.2, 0]} />

      {!mobile && <AmbientParticles count={30} />}
    </ParallaxGroup>
  );
}
