import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ReactorLattice } from './ReactorLattice';
import * as THREE from 'three';

interface SceneProps {
  mobile?: boolean;
  reducedMotion?: boolean;
  orbitControls?: boolean;
  frameloop?: 'always' | 'never';
}

function CameraController({ reducedMotion, orbitControls }: { reducedMotion?: boolean; orbitControls?: boolean }) {
  const { camera } = useThree();
  const scrollRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    if (reducedMotion || orbitControls) return;

    const handleScroll = () => {
      scrollRef.current = window.scrollY / window.innerHeight;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reducedMotion, orbitControls]);

  useEffect(() => {
    // Intimate low-angle framing: close, looking up at the reactor
    camera.position.set(0.5, 0.4, 5.2);
    camera.lookAt(0, 2.0, 0);
  }, [camera]);

  useFrame((state, delta) => {
    if (reducedMotion || orbitControls) return;

    timeRef.current += delta;
    const t = timeRef.current;

    // Cinematic "breathing" dolly: very slow, subtle drift.
    // Camera stays in front (z > 4.5) so it never clips through geometry.
    const orbitX = Math.sin(t * 0.025) * 1.8;
    const orbitZ = 5.0 + Math.sin(t * 0.018 + 1.0) * 0.7;   // 4.3 to 5.7
    const orbitY = 0.35 + Math.sin(t * 0.015) * 0.25;       // 0.1 to 0.6

    const lookTarget = new THREE.Vector3(0, 2.0, 0);

    const lerpFactor = 1 - Math.exp(-delta * 0.8);
    camera.position.x += (orbitX - camera.position.x) * lerpFactor;
    camera.position.z += (orbitZ - camera.position.z) * lerpFactor;
    camera.position.y += (orbitY - camera.position.y) * lerpFactor;

    // Subtle pull-back on scroll
    const scrollOffset = scrollRef.current * 1.2;
    camera.position.z += scrollOffset * 0.02;

    camera.lookAt(lookTarget);
  });

  return null;
}

function SceneContent({ mobile, reducedMotion, orbitControls }: SceneProps) {
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

  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion || orbitControls) return;

    const lerpFactor = 1 - Math.exp(-delta * 3);
    targetRef.current.x += (mouseRef.current.x * 0.12 - targetRef.current.x) * lerpFactor;
    targetRef.current.y += (mouseRef.current.y * 0.08 - targetRef.current.y) * lerpFactor;

    groupRef.current.rotation.y = targetRef.current.x;
    groupRef.current.rotation.x = targetRef.current.y * 0.15;
  });

  return (
    <group ref={groupRef}>
      {/* Slightly larger so it fills the frame at this closer distance */}
      <group scale={1.15}>
        <ReactorLattice mobile={mobile} reducedMotion={reducedMotion} />
      </group>
    </group>
  );
}

export function NucleusScene({ mobile, reducedMotion, orbitControls, frameloop = 'always' }: SceneProps) {
  return (
    <Canvas
      dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
      camera={{ position: [0.5, 0.4, 5.2], fov: 52, near: 0.1, far: 100 }}
      frameloop={frameloop}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <CameraController reducedMotion={reducedMotion} orbitControls={orbitControls} />
      <SceneContent mobile={mobile} reducedMotion={reducedMotion} orbitControls={orbitControls} />
      {orbitControls && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={20}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 + 0.3}
          target={[0, 1.6, 0]}
          autoRotate={false}
        />
      )}
    </Canvas>
  );
}
