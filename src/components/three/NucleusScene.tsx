import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ReactorLattice } from './ReactorLattice';
import * as THREE from 'three';

interface SceneProps {
  mobile?: boolean;
  reducedMotion?: boolean;
  orbitControls?: boolean;
}

function CameraController({ reducedMotion, orbitControls }: { reducedMotion?: boolean; orbitControls?: boolean }) {
  const { camera } = useThree();
  const scrollRef = useRef(0);

  useEffect(() => {
    if (reducedMotion || orbitControls) return;

    const handleScroll = () => {
      scrollRef.current = window.scrollY / window.innerHeight;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reducedMotion, orbitControls]);

  useFrame(() => {
    if (reducedMotion || orbitControls) return;
    // Subtle camera pull-back on scroll
    const targetZ = 7 + scrollRef.current * 2.5;
    camera.position.z += (targetZ - camera.position.z) * 0.02;
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

    // Smooth mouse parallax
    const lerpFactor = 1 - Math.exp(-delta * 3);
    targetRef.current.x += (mouseRef.current.x * 0.2 - targetRef.current.x) * lerpFactor;
    targetRef.current.y += (mouseRef.current.y * 0.15 - targetRef.current.y) * lerpFactor;

    groupRef.current.rotation.y = targetRef.current.x;
    groupRef.current.rotation.x = targetRef.current.y * 0.3;
  });

  return (
    <group ref={groupRef}>
      <ReactorLattice mobile={mobile} reducedMotion={reducedMotion} />
    </group>
  );
}

export function NucleusScene({ mobile, reducedMotion, orbitControls }: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0.5, 3.5, 7.5], fov: 34, near: 0.1, far: 100 }}
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
