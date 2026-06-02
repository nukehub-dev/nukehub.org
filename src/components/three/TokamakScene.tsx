import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getPrimaryColor } from '@lib/themeColors';
import {
  Plasma,
  ToroidalCoils,
  PoloidalCoils,
  CentralSolenoid,
  SupportPedestal,
  VacuumVessel,
  CoilBracing,
  Exoskeleton,
  AccessPorts,
  Divertor,
} from './TokamakPlasma';

/* ------------------------------------------------------------------ */
// Phased camera: one-time entry sweep → idle breathing
/* ------------------------------------------------------------------ */
function CameraRig({
  isVisible,
  orbitControls,
  reducedMotion,
}: {
  isVisible: boolean;
  orbitControls?: boolean;
  reducedMotion?: boolean;
}) {
  const { camera } = useThree();
  const phaseRef = useRef<'ready' | 'entry' | 'idle' | 'paused'>('ready');
  const entryTimeRef = useRef(0);
  const idleTimeRef = useRef(0);

  // Dramatic entry start / end positions — top-down swoop
  const startPos = useMemo(() => new THREE.Vector3(0, 7, 0.5), []);
  const endPos = useMemo(() => new THREE.Vector3(0.5, 0.3, 5.0), []);
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((_state, delta) => {
    if (orbitControls || reducedMotion) return;

    // Trigger entry once when section first scrolls into view
    if (phaseRef.current === 'ready' && isVisible) {
      phaseRef.current = 'entry';
      entryTimeRef.current = 0;
      // Pre-warm camera to start position so there's no jump
      camera.position.copy(startPos);
      camera.lookAt(lookTarget);
    }

    // Pause idle when scrolled away (but let entry finish)
    if (phaseRef.current === 'idle' && !isVisible) {
      phaseRef.current = 'paused';
    }
    if (phaseRef.current === 'paused' && isVisible) {
      phaseRef.current = 'idle';
    }

    // ── Phase 1: Entry sweep — spiral orbit from top (~6s) ──
    if (phaseRef.current === 'entry') {
      entryTimeRef.current += delta;
      const duration = 6;
      const progress = Math.min(entryTimeRef.current / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      // Spiral path: top view → orbit around → frontal
      const angle = -eased * 2.5 * Math.PI;             // 1.25 clockwise rotations
      const y = 0.3 + 6.7 * Math.pow(1 - eased, 1.5);  // ease-out descent
      const radius = 0.5 + 4.5 * Math.pow(eased, 0.7); // ease-out zoom out

      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      camera.position.set(x, y, z);
      camera.lookAt(lookTarget);

      if (progress >= 1) {
        phaseRef.current = 'idle';
        idleTimeRef.current = 0;
      }
      return;
    }

    // ── Phase 2: Idle breathing ──
    if (phaseRef.current === 'idle') {
      idleTimeRef.current += delta;
      const t = idleTimeRef.current;

      // Very subtle drift — similar to Hero's "breathing dolly"
      const targetX = endPos.x + Math.sin(t * 0.025) * 0.8;
      const targetZ = endPos.z + Math.sin(t * 0.018 + 1.0) * 0.35;
      const targetY = endPos.y + Math.sin(t * 0.015) * 0.12;

      const lerpFactor = 1 - Math.exp(-delta * 0.8);
      camera.position.x += (targetX - camera.position.x) * lerpFactor;
      camera.position.z += (targetZ - camera.position.z) * lerpFactor;
      camera.position.y += (targetY - camera.position.y) * lerpFactor;

      camera.lookAt(lookTarget);
    }
  });
  return null;
}

/* ------------------------------------------------------------------ */
// Mouse-driven model tilt
/* ------------------------------------------------------------------ */
function MouseTilt({
  reducedMotion,
  orbitControls,
  children,
}: {
  reducedMotion?: boolean;
  orbitControls?: boolean;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion || orbitControls) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reducedMotion, orbitControls]);

  useFrame((_state, delta) => {
    if (!groupRef.current || reducedMotion || orbitControls) return;

    const lerpFactor = 1 - Math.exp(-delta * 3);
    targetRef.current.x += (mouseRef.current.x * 0.12 - targetRef.current.x) * lerpFactor;
    targetRef.current.y += (mouseRef.current.y * 0.08 - targetRef.current.y) * lerpFactor;

    groupRef.current.rotation.y = targetRef.current.x;
    groupRef.current.rotation.x = targetRef.current.y * 0.15;
  });

  return <group ref={groupRef}>{children}</group>;
}

/* ------------------------------------------------------------------ */
// Ambient glow elements
/* ------------------------------------------------------------------ */
function FloorRing({ accent }: { accent: string }) {
  return (
    <mesh position={[0, -1.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.4, 1.9, 64]} />
      <meshBasicMaterial
        color={accent}
        transparent
        opacity={0.08}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function CoreGlow({ accent }: { accent: string }) {
  return (
    <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.2, 32]} />
      <meshBasicMaterial
        color={accent}
        transparent
        opacity={0.04}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
// Floating particles around reactor
/* ------------------------------------------------------------------ */
function ReactorParticles({ accent }: { accent: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 80;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 2.5;
      const y = (Math.random() - 0.5) * 3;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      vel[i * 3] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return { positions: pos, velocities: vel };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      positions[ix] += velocities[ix];
      positions[ix + 1] += velocities[ix + 1];
      positions[ix + 2] += velocities[ix + 2];

      const dist = Math.sqrt(positions[ix] ** 2 + positions[ix + 2] ** 2);
      if (dist > 4) {
        positions[ix] *= 0.9;
        positions[ix + 2] *= 0.9;
      }
      if (positions[ix + 1] > 2) positions[ix + 1] = -2;
      if (positions[ix + 1] < -2) positions[ix + 1] = 2;

      dummy.position.set(positions[ix], positions[ix + 1], positions[ix + 2]);
      dummy.scale.setScalar(0.012 + Math.random() * 0.008);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <circleGeometry args={[1, 6]} />
      <meshBasicMaterial color={accent} transparent opacity={0.25} depthWrite={false} />
    </instancedMesh>
  );
}

export function TokamakScene({
  isVisible,
  orbitControls,
  mobile,
  reducedMotion,
}: {
  isVisible: boolean;
  orbitControls?: boolean;
  mobile?: boolean;
  reducedMotion?: boolean;
}) {
  const [color, setColor] = useState(() => getPrimaryColor());

  useEffect(() => {
    const update = () => setColor(getPrimaryColor());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-accent', 'data-theme'] });
    return () => obs.disconnect();
  }, []);

  const cameraConfig = useMemo(() => ({ position: [0, 7, 0.5] as [number, number, number], fov: 48 }), []);
  const glConfig = useMemo(() => ({ alpha: true, antialias: true, powerPreference: 'high-performance' as const }), []);

  return (
    <Canvas
      dpr={[1, 1]}
      camera={cameraConfig}
      gl={glConfig}
      frameloop={isVisible ? 'always' : 'never'}
      style={{ background: 'transparent' }}
    >
      <CameraRig isVisible={isVisible} orbitControls={orbitControls} reducedMotion={reducedMotion} />
      {orbitControls && (
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          keyEvents
          minDistance={3}
          maxDistance={12}
          target={[0, 0, 0]}
        />
      )}

      {/* Lighting: plasma glow illuminates the structure */}
      <ambientLight intensity={0.6} />
      <hemisphereLight color="#c8d8f0" groundColor="#0f0f14" intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={2.0} color="#e8ecf0" />
      <directionalLight position={[-3, 2, -6]} intensity={0.5} color="#aabbdd" />

      <MouseTilt reducedMotion={reducedMotion} orbitControls={orbitControls}>
        <SupportPedestal mobile={mobile} />
        <PoloidalCoils mobile={mobile} />
        <CoilBracing mobile={mobile} />
        <ToroidalCoils mobile={mobile} />
        <AccessPorts mobile={mobile} />
        <VacuumVessel mobile={mobile} />
        <Divertor mobile={mobile} />
        <Plasma mobile={mobile} reducedMotion={reducedMotion} accent={color} />
        <CentralSolenoid mobile={mobile} />
        <Exoskeleton mobile={mobile} />

        <FloorRing accent={color} />
        <CoreGlow accent={color} />
        <ReactorParticles accent={color} />

        {/* Plasma core light — illuminates nearby structure */}
        <pointLight color={color} intensity={5} distance={6} decay={1.5} position={[0, 0, 0]} />
        {/* Rim light to define silhouette edges */}
        <pointLight color="#88aaff" intensity={2} distance={8} decay={2} position={[2, 2, 3]} />
        <pointLight color="#6688cc" intensity={1.5} distance={8} decay={2} position={[-2, -1, -3]} />
      </MouseTilt>
    </Canvas>
  );
}
